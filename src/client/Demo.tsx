// /demo: las pantallas reales con jugadores simulados, para probar el juego desde un solo dispositivo.
// La sala vive en memoria y usa las mismas reglas que el servidor (shared/game.ts). No se conecta ni guarda nada.
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as G from '../shared/game';
import Game from './Game';
import Lobby from './Lobby';
import { Toast } from './ui';
import type { RoomConn } from './useRoom';

const NAMES = ['Ana', 'Beto', 'Cristina', 'Dani', 'Eva'];
const SCENES = ['Sala de espera', 'Escribiendo', 'Cazando', 'Resultado', 'Descartó la verdad', 'Fin de partida'] as const;
type Scene = (typeof SCENES)[number];
const BOT_DELAY = 1200;

// Mazo propio de la demo (no el del servidor: así la web sigue sin llevar las respuestas reales), con las trolas de los bots.
const DEMO = [
  { q: '¿Qué animal tiene huellas dactilares casi idénticas a las humanas?', a: 'El koala', fakes: ['El chimpancé', 'El mapache', 'El oso panda'] },
  { q: '¿Para qué se inventó el plástico de burbujas?', a: 'Como papel pintado', fakes: ['Para envolver huevos', 'Como aislante de submarinos', 'Para relajar a los astronautas'] },
  { q: '¿Qué vendía Nintendo antes de hacer videojuegos?', a: 'Barajas de cartas', fakes: ['Bicicletas', 'Arroz instantáneo', 'Paraguas'] },
  { q: '¿Cuál es el animal nacional de Escocia?', a: 'El unicornio', fakes: ['El ciervo rojo', 'El monstruo del lago Ness', 'El águila real'] },
  { q: '¿Contra quién perdió una guerra el ejército australiano en 1932?', a: 'Contra los emús', fakes: ['Contra los canguros', 'Contra Nueva Zelanda', 'Contra los conejos'] },
];
const DECK: G.Deck = DEMO.map((d) => [d.q, d.a]);

/** Lo que escribiría un bot: la respuesta real si le toca la verdad, o una trola distinta para cada uno. */
function botAnswer(room: G.Room, id: string) {
  if (id === room.truthId) return room.answer;
  const liars = room.players.filter((p) => p.id !== room.readerId && p.id !== room.truthId).map((p) => p.id);
  const fakes = DEMO.find((d) => d.q === room.question)?.fakes ?? ['No tengo ni idea'];
  return fakes[liars.indexOf(id) % fakes.length];
}

/** Sala nueva llevada hasta la escena pedida con las reglas de verdad. Lee Ana (p0); dice la verdad Beto (p1). */
function build(scene: Scene): G.Room {
  const room = G.newRoom('DEMO01', 'p0', '', NAMES[0]);
  NAMES.slice(1).forEach((name, i) => G.addPlayer(room, `p${i + 1}`, '', name));
  for (const p of room.players) p.connected = true;
  if (scene === 'Sala de espera') return room;
  G.startGame(room, 'p0', 2, DECK, () => 0);
  const write = (ids: string[]) => ids.forEach((id) => G.write(room, id, botAnswer(room, id)));
  if (scene === 'Escribiendo') {
    write(['p1', 'p2']);
    return room;
  }
  write(['p1', 'p2', 'p3', 'p4']);
  if (scene === 'Fin de partida') {
    room.round = G.totalRounds(room);
    [1, 5, 2, 4, 3].forEach((score, i) => (room.players[i].score = score));
  }
  const discards = { Cazando: ['p3'], Resultado: ['p3', 'p4'], 'Descartó la verdad': ['p2', 'p1'], 'Fin de partida': ['p2', 'p3', 'p4'] }[scene];
  for (const id of discards) G.discard(room, 'p0', id);
  if (scene === 'Resultado') G.stop(room, 'p0');
  return room;
}

/** Lo que haría el resto de la mesa: un paso cada vez, para poder jugar la ronda solo. No pasa de ronda: eso lo decides tú. */
function botStep(room: G.Room, me: string): boolean {
  if (room.phase === 'writing') {
    const bot = room.players.find((p) => p.id !== me && p.id !== room.readerId && !room.answers[p.id]);
    return !!bot && !G.write(room, bot.id, botAnswer(room, bot.id));
  }
  if (room.phase === 'hunting' && room.readerId !== me) {
    if (room.bank >= 2) return !G.stop(room, room.readerId); // un lector prudente
    const left = Object.keys(room.answers).filter((id) => !room.out.includes(id));
    return !G.discard(room, room.readerId, left[Math.floor(Math.random() * left.length)]);
  }
  return false;
}

export default function Demo() {
  const roomRef = useRef<G.Room>(null!);
  roomRef.current ??= build('Sala de espera');
  const room = roomRef.current;
  const [version, refresh] = useReducer((n: number) => n + 1, 0);
  const [me, setMe] = useState('p0');
  const [toast, setToast] = useState('');

  const go = (scene: Scene) => {
    roomRef.current = build(scene);
    setToast('');
    refresh();
  };

  // Los demás jugadores actúan solos, con una pausa para que se vea el cambio.
  useEffect(() => {
    const id = setTimeout(() => botStep(room, me) && refresh(), BOT_DELAY);
    return () => clearTimeout(id);
  }, [room, version, me]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  const conn = useMemo<RoomConn>(() => {
    // Lo mismo que hace el servidor al recibir un mensaje (worker/room.ts), sobre la sala en memoria.
    const send = (msg: object) => {
      const m = msg as Record<string, unknown>;
      let error: string | undefined;
      switch (m.t) {
        case 'start':
          error = G.startGame(room, me, m.laps, DECK, Math.random);
          break;
        case 'write':
          error = G.write(room, me, m.text);
          break;
        case 'skip':
          error = G.skip(room, me, DECK, Math.random);
          break;
        case 'discard':
          error = G.discard(room, me, m.id);
          break;
        case 'stop':
          error = G.stop(room, me);
          break;
        case 'next':
          error = G.nextRound(room, me, DECK, Math.random);
          break;
        case 'abort':
          error = G.abort(room, me);
          break;
        case 'kick':
          if (me === room.hostId && m.id !== me) error = G.removePlayer(room, m.id as string);
          break;
        default:
          return;
      }
      if (error) setToast(error);
      refresh();
    };
    return { view: null, online: true, toast, send };
  }, [room, me, toast]);

  const you = room.players.some((p) => p.id === me) ? me : room.hostId;
  const view = G.viewFor(room, you);
  const role = (id: string) =>
    [
      id === room.hostId && 'anfitrión',
      room.phase !== 'lobby' && id === room.readerId && 'lee',
      room.phase !== 'lobby' && id === room.truthId && 'verdad',
    ]
      .filter(Boolean)
      .join(', ');

  return (
    <>
      {view.phase === 'lobby' ? (
        <Lobby room={conn} view={view} onLeave={() => location.assign('/')} />
      ) : (
        <Game key={you} view={view} send={conn.send} />
      )}
      <Toast text={toast} />
      <details className="bg-paper border-line fixed bottom-2 left-2 z-50 max-w-64 rounded-lg border text-sm shadow-lg">
        <summary className="cursor-pointer px-3 py-2 font-bold select-none">Demo</summary>
        <div className="flex max-h-[70dvh] flex-col gap-2 overflow-y-auto p-3 pt-0">
          <label className="label" htmlFor="demo-me">
            Ver como
          </label>
          <select id="demo-me" className="input" value={you} onChange={(e) => setMe(e.target.value)}>
            {room.players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {role(p.id) && ` (${role(p.id)})`}
              </option>
            ))}
          </select>
          <p className="label">Ir a</p>
          {SCENES.map((scene) => (
            <button key={scene} className="btn btn-ghost min-h-11 justify-start" onClick={() => go(scene)}>
              {scene}
            </button>
          ))}
          <a className="text-muted underline" href="/">
            Salir de la demo
          </a>
        </div>
      </details>
    </>
  );
}
