// Check único de las reglas: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as G from './game.ts';

const DECK: G.Deck = [
  ['¿Pregunta A?', 'Respuesta A'],
  ['¿Pregunta B?', 'Respuesta B'],
];
const first = () => 0; // siempre el primero: lector p0, pregunta A, verdad p1

/** Sala con n jugadores conectados (p0 anfitrión), ya escribiendo. */
function playing(n = 4) {
  const room = G.newRoom('ABC123', 'p0', 't0', 'Jugador 0');
  for (let i = 1; i < n; i++) G.addPlayer(room, `p${i}`, `t${i}`, `Jugador ${i}`);
  for (const p of room.players) p.connected = true;
  assert.equal(G.startGame(room, 'p0', 2, DECK, first), undefined);
  return room;
}

function writeAll(room: G.Room) {
  for (const p of room.players) if (p.id !== room.readerId) assert.equal(G.write(room, p.id, `dice ${p.id}`), undefined);
}

const score = (room: G.Room, id: string) => room.players.find((p) => p.id === id)!.score;

test('reparto: un lector, una verdad y el resto trolas; nadie ve lo que no le toca', () => {
  const room = playing();
  assert.equal(room.readerId, 'p0');
  assert.equal(room.truthId, 'p1');
  assert.equal(room.question, '¿Pregunta A?');
  const view = (id: string) => G.viewFor(room, id);
  assert.equal(view('p0').answer, null); // el lector no sabe la respuesta
  assert.equal(view('p0').role, null);
  assert.equal(view('p1').role, 'truth');
  assert.equal(view('p2').role, 'lie');
  assert.equal(view('p2').answer, 'Respuesta A');
  assert.ok(!JSON.stringify(view('p0')).includes('Respuesta A'));
  assert.ok(!JSON.stringify(view('p2')).includes('"t0"')); // los tokens no salen

  assert.equal(G.write(room, 'p0', 'algo'), 'Tú lees la pregunta: no escribes');
  assert.equal(G.write(room, 'p1', '   '), `Escribe una respuesta de hasta ${G.ANSWER_MAX} caracteres`);
  G.write(room, 'p1', 'Respuesta   A');
  assert.equal(room.answers.p1, 'Respuesta A');
  assert.deepEqual(view('p0').answers, []); // nada a la vista hasta que escriban todos
  assert.equal(view('p0').done, 1);
  writeAll(room);
  assert.equal(room.phase, 'hunting');
  assert.equal(view('p0').answers.length, 3);
  assert.equal(view('p0').truthId, null); // sigue sin saber cuál es la verdad
});

test('cazar todas las trolas: un punto por cada una y la ronda acaba sola', () => {
  const room = playing();
  writeAll(room);
  assert.equal(G.discard(room, 'p1', 'p2'), 'Solo descarta quien lee la pregunta');
  assert.equal(G.discard(room, 'p0', 'p2'), undefined);
  assert.equal(G.discard(room, 'p0', 'p2'), 'Respuesta no válida'); // ya descartada
  assert.equal(room.bank, 1);
  G.discard(room, 'p0', 'p3');
  assert.equal(room.phase, 'result');
  assert.equal(score(room, 'p0'), 2);
  assert.equal(G.viewFor(room, 'p2').truthId, 'p1');
});

test('descartar la verdad: pierde los puntos de la ronda', () => {
  const room = playing(5);
  writeAll(room);
  G.discard(room, 'p0', 'p2');
  G.discard(room, 'p0', 'p1');
  assert.equal(room.phase, 'result');
  assert.ok(room.busted);
  assert.equal(score(room, 'p0'), 0);
});

test('plantarse conserva lo cazado; el siguiente lector es el de la izquierda', () => {
  const room = playing();
  writeAll(room);
  G.discard(room, 'p0', 'p3');
  assert.equal(G.stop(room, 'p2'), 'Solo se planta quien lee la pregunta');
  assert.equal(G.stop(room, 'p0'), undefined);
  assert.equal(score(room, 'p0'), 1);
  assert.equal(G.nextRound(room, 'p2', DECK, first), 'Solo el lector o el anfitrión pueden continuar');
  assert.equal(G.nextRound(room, 'p0', DECK, first), undefined);
  assert.equal(room.readerId, 'p1');
  assert.equal(room.question, '¿Pregunta B?'); // no repite pregunta
  assert.notEqual(room.truthId, 'p1');
  assert.deepEqual(room.answers, {});
});

test('seguir sin esperar: sin la verdad, otra pregunta; con verdad y una trola, a cazar', () => {
  const room = playing();
  G.write(room, 'p2', 'trola');
  assert.equal(G.skip(room, 'p1', DECK, first), 'Solo el anfitrión puede seguir sin esperar');
  G.skip(room, 'p0', DECK, first);
  assert.equal(room.phase, 'writing');
  assert.equal(room.question, '¿Pregunta B?');
  assert.deepEqual(room.answers, {});
  G.write(room, room.truthId, 'verdad');
  G.write(room, room.players.find((p) => p.id !== room.readerId && p.id !== room.truthId)!.id, 'trola');
  G.skip(room, 'p0', DECK, first);
  assert.equal(room.phase, 'hunting');
  assert.equal(G.viewFor(room, 'p0').answers.length, 2);
});

test('la verdad le toca a alguien conectado; la partida acaba cuando todos han leído las vueltas elegidas', () => {
  const room = playing(3);
  room.players[1].connected = false;
  G.abort(room, 'p0');
  assert.equal(G.startGame(room, 'p0', 4, DECK, first), 'Elige cuántas vueltas');
  assert.equal(G.startGame(room, 'p0', '2', DECK, first), 'Elige cuántas vueltas');
  G.startGame(room, 'p0', 2, DECK, first);
  assert.equal(room.truthId, 'p2');
  assert.equal(G.viewFor(room, 'p0').total, 6);
  for (let r = 1; r <= 6; r++) {
    assert.equal(room.round, r);
    writeAll(room);
    G.stop(room, room.readerId);
    G.nextRound(room, 'p0', DECK, first);
  }
  assert.equal(room.phase, 'lobby');
  assert.equal(G.canJoin(room, 'Nuevo'), undefined); // se puede entrar para la siguiente
  G.startGame(room, 'p0', 1, DECK, first);
  assert.equal(G.viewFor(room, 'p0').total, 3); // una vuelta: cada uno lee una vez
});
