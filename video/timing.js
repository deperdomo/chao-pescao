// Tiempos (en segundos) compartidos por la animación (index.html) y la banda sonora (sound.mjs).
// Rumba a 120 BPM: un pulso cada 0,5 s y un compás cada 2 s. Los cortes de escena caen en inicio de compás.
const seq = (t, step, n) => Array.from({ length: n }, (_, i) => +(t + step * i).toFixed(3));
const QUESTION = '¿Qué animal tiene huellas dactilares casi idénticas a las humanas?'; // del mazo de la demo, no del real
globalThis.T = {
  end: 42, // = data-duration de #root en index.html
  cuts: [4, 10, 16, 22, 34, 38],
  // 0 · Portada
  back: 0, // el reverso de la baraja ya está en el primer fotograma, girando
  slam: 1.3, // golpe del título
  tag: 1.7,
  // 1 · Sala
  code: seq(4.75, 0.125, 6),
  players: seq(5.6, 0.125, 6),
  friendsCap: 6.4,
  // 2 · Pregunta
  reader: 10.5,
  question: QUESTION,
  typing: seq(10.9, 0.035, [...QUESTION].length), // una tecla por letra: termina a los 13,2 s
  questionCap: 13.3,
  unknown: seq(13.75, 0.25, 3), // los "¿?" que caen sobre la pregunta
  // 3 · Cartas secretas
  deal: seq(16.5, 0.125, 4),
  flips: seq(17.5, 0.375, 4), // la primera es la verdad
  secretCap: 18.2,
  // 4 · Cazar trolas
  answers: seq(22.5, 0.25, 4),
  hunts: [24.5, 26.5], // dos trolas cazadas: +1, +2
  doubt: 28, // elige "El koala": la música se corta y late el corazón
  beats: [28.1, 28.9, 29.5],
  boom: 30, // ¡era la verdad!
  verdictCap: 30.9,
  // 5 · Clasificación
  ranks: seq(34.4, 0.25, 4),
  rankCap: 35,
  crown: 36,
  // 6 · Cierre
  outroSlam: 39,
  cta: 39.5,
};
