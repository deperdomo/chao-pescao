// Una sala = un Durable Object. Guarda el estado, aplica las reglas (src/shared/game.ts)
// y envía a cada jugador solo lo que le corresponde ver.
import { Server, type Connection, type ConnectionContext, type WSMessage } from 'partyserver';
import * as G from '../src/shared/game';
import { QUESTIONS } from './questions';

type Conn = Connection<{ pid?: string } | null>;

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

  async onStart() {
    const saved = await this.ctx.storage.get<string>('room');
    if (!saved) return;
    this.room = JSON.parse(saved) as G.Room;
    for (const p of this.room.players) p.connected = false; // tras un reinicio todos reconectan
  }

  private conns(): Conn[] {
    return [...this.getConnections<{ pid?: string } | null>()];
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
    this.attach(conn, G.addPlayer(room, newId(), token, name).id);
  }

  private attach(conn: Conn, pid: string) {
    conn.setState({ pid });
    this.ctx.waitUntil(this.ctx.storage.deleteAlarm());
    this.presence();
    this.changed();
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

  /** Tras cualquier cambio: snapshot en storage y vista personalizada a cada jugador. */
  private changed() {
    const room = this.room!;
    this.ctx.waitUntil(this.ctx.storage.put('room', JSON.stringify(room)));
    for (const c of this.conns()) if (c.state?.pid) send(c, { t: 'state', s: G.viewFor(room, c.state.pid) });
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

    let error: string | undefined;
    switch (m.t) {
      case 'start':
        error = G.startGame(room, pid, QUESTIONS, random);
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
      default:
        return;
    }
    if (error) return send(conn, { t: 'toast', msg: error });
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
    await this.ctx.storage.delete('room');
    await this.ctx.storage.deleteAlarm();
  }
}
