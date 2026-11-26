// Una sala = un Durable Object. Guarda el estado, aplica las reglas (src/shared/game.ts)
// y envía a cada jugador solo lo que le corresponde ver.
import { Server, type Connection, type ConnectionContext, type WSMessage } from 'partyserver';
import * as G from '../src/shared/game';
import { directory } from './directory';
import { QUESTIONS } from './questions';

type ConnState = { pid?: string; pending?: { token: string; name: string } };
type Conn = Connection<ConnState | null>;

const TOKEN = /^[\w-]{16,64}$/;
// Sala sin nadie conectado: margen para que el anfitrión salga a compartir el enlace, o para recargar a mitad de partida.
const LOBBY_TTL = 2 * 60_000;
const GAME_TTL = 30 * 60_000;
const MAX_MESSAGE = 2_000;

const newId = () => crypto.randomUUID().slice(0, 8);
const random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

function send(conn: WebSocket, msg: G.ServerMsg) {
  try {
    conn.send(JSON.stringify(msg));
  } catch {
    // conexión ya cerrada
  }
}

// ponytail: sin hibernación, el estado vive en memoria mientras haya alguien conectado (y en storage por si reinicia).
export class Room extends Server<Env> {
  private room: G.Room | null = null;
  private listed = ''; // última fila enviada al directorio de salas abiertas
  private dirQueue: Promise<unknown> = Promise.resolve();

  async onStart() {
    const saved = await this.ctx.storage.get<string>('room');
    if (!saved) return;
    this.room = JSON.parse(saved) as G.Room;
    for (const p of this.room.players) p.connected = false; // tras un reinicio todos reconectan
  }

  private conns(): Conn[] {
    return [...this.getConnections<ConnState | null>()];
  }

  /** RPC desde el Worker (POST /api/rooms). Devuelve false si el código ya está en uso. */
  async create(token: string, name: string): Promise<boolean> {
    if (this.room) return false;
    this.room = G.newRoom(this.name, newId(), token, name);
    this.changed();
    await this.ctx.storage.setAlarm(Date.now() + LOBBY_TTL); // por si el anfitrión no llega a entrar
    return true;
  }

  onConnect(conn: Conn, { request }: ConnectionContext) {
    const q = new URL(request.url).searchParams;
    const token = q.get('token') ?? '';
    const name = (q.get('name') ?? '').trim();
    const room = this.room;
    if (!room) return this.expel(conn, 'La sala no existe o ya se ha cerrado');
    if (!TOKEN.test(token)) return this.expel(conn, 'Solicitud no válida');

    const known = room.players.find((p) => p.token === token);
    if (known) return this.attach(conn, known.id); // reconexión: recupera su asiento en cualquier fase

    const error = G.canJoin(room, name);
    if (error) return this.expel(conn, error);
    if (q.get('mode') === 'request') {
      // Viene de la lista de salas abiertas: espera a que el anfitrión lo acepte.
      conn.setState({ pending: { token, name } });
      send(conn, { t: 'pending' });
      this.toHost({ t: 'request', id: conn.id, name });
      return;
    }
    this.attach(conn, G.addPlayer(room, newId(), token, name).id);
  }

  private attach(conn: Conn, pid: string) {
    conn.setState({ pid });
    this.ctx.waitUntil(this.ctx.storage.deleteAlarm());
    this.presence();
    if (pid === this.room!.hostId) {
      for (const c of this.conns()) if (c.state?.pending) send(conn, { t: 'request', id: c.id, name: c.state.pending.name });
    }
    this.changed();
  }

  private toHost(msg: G.ServerMsg) {
    for (const c of this.conns()) if (c.state?.pid === this.room?.hostId) send(c, msg);
  }

  /** El anfitrión responde a una solicitud de entrada. */
  private answer(by: string, connId: unknown, ok: boolean) {
    const room = this.room!;
    if (by !== room.hostId || typeof connId !== 'string') return;
    const conn = this.getConnection<ConnState | null>(connId);
    const pending = conn?.state?.pending;
    if (!conn || !pending) return;
    const host = room.players.find((p) => p.id === room.hostId);
    const error = ok ? G.canJoin(room, pending.name) : `${host?.name ?? 'El anfitrión'} ha rechazado tu solicitud`;
    if (error) return this.expel(conn, error);
    this.attach(conn, G.addPlayer(room, newId(), pending.token, pending.name).id);
  }

  /** Saca a una conexión de la sala con un motivo; el cliente no reconecta. */
  private expel(conn: Conn, msg: string) {
    send(conn, { t: 'closed', msg });
    conn.setState(null);
    conn.close(4000, 'closed');
  }

  private presence(closing?: string) {
    const online = new Set(this.conns().filter((c) => c.id !== closing).map((c) => c.state?.pid));
    for (const p of this.room!.players) p.connected = online.has(p.id);
  }

  /** Tras cualquier cambio: snapshot en storage, vista personalizada a cada jugador y aviso al directorio. */
  private changed() {
    const room = this.room!;
    this.ctx.waitUntil(this.ctx.storage.put('room', JSON.stringify(room)));
    for (const c of this.conns()) if (c.state?.pid) send(c, { t: 'state', s: G.viewFor(room, c.state.pid) });
    this.list();
  }

  /** Mantiene la sala en la lista de salas abiertas mientras está en espera. Solo avisa si algo ha cambiado. */
  private list() {
    const room = this.room;
    const row =
      room?.phase === 'lobby'
        ? { code: room.code, hostName: room.players.find((p) => p.id === room.hostId)?.name ?? '', playerCount: room.players.length }
        : null;
    const key = JSON.stringify(row);
    if (key === this.listed) return;
    this.listed = key;
    // En cola: los avisos llegan en orden. Un fallo solo afecta a la lista, no a la partida.
    this.dirQueue = this.dirQueue
      .then(() => directory(this.env).set(this.name, row))
      .catch((e) => console.warn(`directory ${this.name}: ${e}`));
    this.ctx.waitUntil(this.dirQueue);
  }

  onMessage(conn: Conn, raw: WSMessage) {
    const room = this.room;
    const pid = conn.state?.pid;
    if (!room || !pid || typeof raw !== 'string' || raw.length > MAX_MESSAGE) return;
    let m: Record<string, unknown>;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    if (!m || typeof m !== 'object') return;

    const before = room.phase;
    let error: string | undefined;
    switch (m.t) {
      case 'start':
        error = G.startGame(room, pid, m.laps, QUESTIONS, random);
        break;
      case 'write':
        error = G.write(room, pid, m.text);
        break;
      case 'skip':
        error = G.skip(room, pid, QUESTIONS, random);
        break;
      case 'discard':
        error = G.discard(room, pid, m.id);
        break;
      case 'stop':
        error = G.stop(room, pid);
        break;
      case 'next':
        error = G.nextRound(room, pid, QUESTIONS, random);
        break;
      case 'abort':
        error = G.abort(room, pid);
        break;
      case 'kick':
        return this.remove(pid, m.id);
      case 'leave':
        return this.remove(pid, pid);
      case 'answer':
        return this.answer(pid, m.id, m.ok === true);
      default:
        return;
    }
    if (error) return send(conn, { t: 'toast', msg: error });
    if (before === 'lobby' && room.phase !== 'lobby') {
      for (const c of this.conns()) if (c.state?.pending) this.expel(c, 'La partida ya ha empezado');
    }
    this.changed();
  }

  /** Salir o expulsar, solo en la sala de espera. Si se va el anfitrión, la sala se cierra. */
  private remove(by: string, target: unknown) {
    const room = this.room!;
    if (room.phase !== 'lobby' || (by !== target && by !== room.hostId)) return;
    if (target === room.hostId) return this.closeRoom('El anfitrión ha cerrado la sala');
    if (typeof target !== 'string' || G.removePlayer(room, target)) return;
    for (const c of this.conns()) {
      if (c.state?.pid === target) this.expel(c, by === target ? '' : 'El anfitrión te ha sacado de la sala');
    }
    this.changed();
  }

  onClose(conn: Conn) {
    const room = this.room;
    if (!room || !conn.state) return;
    if (conn.state.pending) return this.toHost({ t: 'requestGone', id: conn.id });
    this.presence(conn.id);
    this.changed();
    if (!room.players.some((p) => p.connected)) {
      this.ctx.waitUntil(this.ctx.storage.setAlarm(Date.now() + (room.phase === 'lobby' ? LOBBY_TTL : GAME_TTL)));
    }
  }

  onError(conn: Conn) {
    this.onClose(conn);
  }

  async onAlarm() {
    if (this.room && !this.conns().some((c) => c.state?.pid)) await this.closeRoom('');
  }

  private async closeRoom(msg: string) {
    this.room = null; // antes de expulsar: onClose ya no hace nada
    for (const c of this.conns()) this.expel(c, msg);
    this.list();
    await this.ctx.storage.delete('room');
    await this.ctx.storage.deleteAlarm();
  }
}
