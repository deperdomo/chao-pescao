// Reglas de Trola. Lógica pura: sin DOM ni APIs del Worker.
// El servidor (worker/room.ts) es la autoridad; el cliente solo usa tipos y constantes.
// Las acciones mutan la sala y devuelven un mensaje de error, o undefined si todo fue bien.
//
// Cada ronda, un jugador (el lector) lee una pregunta rara sin saber la respuesta. Los demás la ven:
// a uno le toca decir la verdad y al resto inventar una trola. El lector descarta respuestas una a una:
// +1 por cada trola cazada. Puede plantarse cuando quiera; si descarta la verdad, pierde los puntos de la ronda.

export const MIN_PLAYERS = 3; // lector + verdad + al menos una trola
export const MAX_PLAYERS = 15;
export const LAP_CHOICES = [1, 2, 3]; // vueltas: veces que lee cada jugador. Lo elige el anfitrión al empezar
export const NAME_MAX = 20;
export const ANSWER_MAX = 80;

export type Phase = 'lobby' | 'writing' | 'hunting' | 'result';
export type Deck = readonly (readonly [question: string, answer: string])[];

export interface Player {
  id: string; // público
  token: string; // secreto: identifica al navegador del jugador
  name: string;
  score: number;
  connected: boolean;
}

export interface Room {
  code: string;
  hostId: string;
  players: Player[]; // orden de asiento (y de lectura)
  phase: Phase;
  round: number;
  laps: number;
  readerId: string;
  truthId: string;
  question: string;
  answer: string;
  used: number[]; // preguntas ya salidas en esta sala (índices del mazo)
  answers: Record<string, string>; // jugador -> lo que ha escrito
  out: string[]; // descartados por el lector, en orden
  bank: number; // puntos que lleva el lector en esta ronda
  busted: boolean; // descartó la verdad
}

/** Lo que ve un jugador concreto: la sala sin los secretos que no le corresponden. */
export interface View {
  code: string;
  you: string;
  hostId: string;
  players: Omit<Player, 'token'>[];
  phase: Phase;
  round: number;
  total: number; // rondas de la partida
  readerId: string;
  question: string;
  answer: string | null; // la respuesta real: los que no leen mientras se juega, todos al final
  role: 'truth' | 'lie' | null; // tu papel en la ronda (null si lees o no hay ronda)
  mine: string; // lo que has escrito
  done: number; // cuántos han escrito ya
  writers: number; // cuántos tienen que escribir
  answers: { id: string; text: string }[]; // a la vista al cazar y al final
  out: string[];
  truthId: string | null; // solo al final de la ronda
  bank: number;
  busted: boolean;
}

const roundReset = () => ({ truthId: '', question: '', answer: '', answers: {}, out: [], bank: 0, busted: false });

export const isValidName = (name: unknown): name is string =>
  typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= NAME_MAX;

const cleanText = (v: unknown, max: number) => {
  const s = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
  return s.length >= 1 && s.length <= max ? s : null;
};

export function newRoom(code: string, hostId: string, hostToken: string, hostName: string): Room {
  const room: Room = { code, hostId, players: [], phase: 'lobby', round: 0, laps: 2, readerId: hostId, used: [], ...roundReset() };
  addPlayer(room, hostId, hostToken, hostName);
  return room;
}

export function canJoin(room: Room, name: unknown): string | undefined {
  if (room.phase !== 'lobby') return 'La partida ya ha empezado';
  if (room.players.length >= MAX_PLAYERS) return 'La sala está llena';
  if (!isValidName(name)) return `El nombre debe tener entre 2 y ${NAME_MAX} caracteres`;
  const lower = name.trim().toLowerCase();
  if (room.players.some((p) => p.name.toLowerCase() === lower)) return 'Ese nombre ya está en la sala';
}

/** Llamar antes a canJoin. */
export function addPlayer(room: Room, id: string, token: string, name: string): Player {
  const player: Player = { id, token, name: name.trim(), score: 0, connected: false };
  room.players.push(player);
  return player;
}

export function removePlayer(room: Room, id: string): string | undefined {
  if (room.phase !== 'lobby') return 'No se puede salir con la partida en marcha';
  room.players = room.players.filter((p) => p.id !== id);
}

export const totalRounds = (room: Room) => room.players.length * room.laps;
const writersOf = (room: Room) => room.players.filter((p) => p.id !== room.readerId);

/** Nueva pregunta para el lector actual. La verdad le toca a alguien conectado si lo hay. */
function deal(room: Room, deck: Deck, rand: () => number) {
  if (room.used.length >= deck.length) room.used = [];
  const free = deck.map((_, i) => i).filter((i) => !room.used.includes(i));
  const q = free[Math.floor(rand() * free.length)];
  const writers = writersOf(room);
  const online = writers.filter((p) => p.connected);
  const pool = online.length ? online : writers;
  Object.assign(room, roundReset());
  room.used.push(q);
  [room.question, room.answer] = deck[q];
  room.truthId = pool[Math.floor(rand() * pool.length)].id;
  room.phase = 'writing';
}

export function startGame(room: Room, by: string, laps: unknown, deck: Deck, rand: () => number): string | undefined {
  if (by !== room.hostId) return 'Solo el anfitrión puede empezar';
  if (room.phase !== 'lobby') return 'La partida ya ha empezado';
  if (room.players.length < MIN_PLAYERS) return `Hacen falta al menos ${MIN_PLAYERS} jugadores`;
  if (typeof laps !== 'number' || !LAP_CHOICES.includes(laps)) return 'Elige cuántas vueltas';
  room.laps = laps;
  for (const p of room.players) p.score = 0;
  room.round = 1;
  room.readerId = room.players[Math.floor(rand() * room.players.length)].id;
  deal(room, deck, rand);
}

/** Cada jugador escribe su respuesta (la verdad o una trola). Se puede cambiar hasta que escriban todos. */
export function write(room: Room, by: string, text: unknown): string | undefined {
  if (room.phase !== 'writing') return 'Ahora no toca escribir';
  if (by === room.readerId) return 'Tú lees la pregunta: no escribes';
  if (!room.players.some((p) => p.id === by)) return 'No estás en la partida';
  const answer = cleanText(text, ANSWER_MAX);
  if (!answer) return `Escribe una respuesta de hasta ${ANSWER_MAX} caracteres`;
  room.answers[by] = answer;
  if (writersOf(room).every((p) => room.answers[p.id])) room.phase = 'hunting';
}

/**
 * El anfitrión no espera a quien no escribe (p. ej. se le apagó el móvil).
 * Si ya están la verdad y alguna trola, se caza sin los que faltan; si no, otra pregunta para el mismo lector.
 */
export function skip(room: Room, by: string, deck: Deck, rand: () => number): string | undefined {
  if (by !== room.hostId) return 'Solo el anfitrión puede seguir sin esperar';
  if (room.phase !== 'writing') return 'Ahora no se está escribiendo';
  if (room.answers[room.truthId] && Object.keys(room.answers).length >= 2) room.phase = 'hunting';
  else deal(room, deck, rand);
}

const liars = (room: Room) => Object.keys(room.answers).filter((id) => id !== room.truthId);

/** El lector descarta una respuesta. Trola: +1. Verdad: pierde lo de la ronda y se acaba. */
export function discard(room: Room, by: string, target: unknown): string | undefined {
  if (room.phase !== 'hunting') return 'Ahora no se puede descartar';
  if (by !== room.readerId) return 'Solo descarta quien lee la pregunta';
  if (typeof target !== 'string' || !room.answers[target] || room.out.includes(target)) return 'Respuesta no válida';
  room.out.push(target);
  if (target === room.truthId) {
    room.busted = true;
    room.bank = 0;
    finish(room);
    return;
  }
  room.bank++;
  if (liars(room).every((id) => room.out.includes(id))) finish(room); // todas cazadas
}

/** El lector se planta con lo que lleva. El anfitrión también puede, por si el lector se ha ido. */
export function stop(room: Room, by: string): string | undefined {
  if (room.phase !== 'hunting') return 'Ahora no se puede plantar';
  if (by !== room.readerId && by !== room.hostId) return 'Solo se planta quien lee la pregunta';
  finish(room);
}

function finish(room: Room) {
  const reader = room.players.find((p) => p.id === room.readerId);
  if (reader) reader.score += room.bank;
  room.phase = 'result';
}

/** Siguiente lector a la izquierda; tras la última ronda, vuelta a la sala de espera con los puntos a la vista. */
export function nextRound(room: Room, by: string, deck: Deck, rand: () => number): string | undefined {
  if (room.phase !== 'result') return 'La ronda no ha terminado';
  if (by !== room.hostId && by !== room.readerId) return 'Solo el lector o el anfitrión pueden continuar';
  if (room.round >= totalRounds(room)) {
    room.phase = 'lobby';
    return;
  }
  const seat = room.players.findIndex((p) => p.id === room.readerId);
  room.readerId = room.players[(seat + 1) % room.players.length].id;
  room.round++;
  deal(room, deck, rand);
}

/** El anfitrión termina la partida y vuelve a la sala de espera (p. ej. para que entre alguien más). */
export function abort(room: Room, by: string): string | undefined {
  if (by !== room.hostId) return 'Solo el anfitrión puede terminar la partida';
  if (room.phase === 'lobby') return 'No hay partida en marcha';
  room.phase = 'lobby';
}

export function viewFor(room: Room, you: string): View {
  const playing = room.phase === 'writing' || room.phase === 'hunting';
  const ended = room.phase === 'result';
  const writing = playing && you !== room.readerId && room.players.some((p) => p.id === you);
  const shown = room.phase === 'hunting' || ended;
  return {
    code: room.code,
    you,
    hostId: room.hostId,
    players: room.players.map(({ token: _token, ...p }) => p),
    phase: room.phase,
    round: room.round,
    total: totalRounds(room),
    readerId: room.readerId,
    question: playing || ended ? room.question : '',
    answer: writing || ended ? room.answer : null,
    role: writing ? (you === room.truthId ? 'truth' : 'lie') : null,
    mine: room.answers[you] ?? '',
    done: Object.keys(room.answers).length,
    writers: writersOf(room).length,
    answers: shown ? room.players.filter((p) => room.answers[p.id]).map((p) => ({ id: p.id, text: room.answers[p.id] })) : [],
    out: room.out,
    truthId: ended ? room.truthId : null,
    bank: room.bank,
    busted: room.busted,
  };
}

/** Mensajes del servidor al cliente. */
export type ServerMsg =
  | { t: 'state'; s: View }
  | { t: 'pending' } // solicitud de entrada enviada al anfitrión
  | { t: 'request'; id: string; name: string } // (anfitrión) alguien pide entrar
  | { t: 'requestGone'; id: string }
  | { t: 'toast'; msg: string }
  | { t: 'closed'; msg: string }; // fuera de la sala: no reconectar
