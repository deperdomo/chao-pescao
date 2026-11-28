// Banda sonora sintetizada: rumba flamenca + efectos, sin samples ni dependencias. Genera assets/soundtrack.wav.
// Uso: node sound.mjs (lo ejecuta npm run render). Los tiempos vienen de timing.js, igual que la animación.
import { writeFileSync } from 'node:fs';
import './timing.js';

const T = globalThis.T;
const SR = 44100;
const N = SR * T.end;
const out = new Float32Array(N);
const TAU = Math.PI * 2;
let seed = 11; // ruido determinista: el mismo audio en cada ejecución
const noise = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 31 - 1;
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

/** Suma una voz: fn(segundos desde su inicio, progreso 0..1) -> muestra. Se llama en orden: puede tener estado. */
const play = (at, dur, gain, fn) => {
  const s = Math.round(at * SR);
  const n = Math.round(dur * SR);
  for (let i = 0; i < n && s + i < N; i++) if (s + i >= 0) out[s + i] += gain * fn(i / SR, i / n);
};

const fat = (ph) => Math.tanh(2.5 * Math.sin(ph));
const square = (ph) => Math.sign(Math.sin(ph));
const tone = (at, dur, gain, f, decay, shape = Math.sin) =>
  play(at, dur, gain, (x) => shape(TAU * f * x) * Math.exp(-decay * x) * Math.min(1, x * 400));
const sweep = (at, dur, gain, f0, f1, decay) =>
  play(at, dur, gain, (x) => Math.sin(TAU * (f0 * x + ((f1 - f0) * x * x) / (2 * dur))) * Math.exp(-decay * x));
/** Ruido con los graves quitados (diferencia de muestras): chasquidos, palmas, roces. */
const hiss = (at, dur, gain, decay) => {
  let prev = 0;
  play(at, dur, gain, (x) => {
    const n = noise();
    const v = n - prev;
    prev = n;
    return v * Math.exp(-decay * x);
  });
};

// ── Instrumentos ─────────────────────────────────────────────────────────────
/** Cuerda de guitarra (Karplus-Strong): un ruido que se repite y se suaviza en cada vuelta. */
const string = (at, midi, dur, gain, bright = 0.6) => {
  const f = hz(midi);
  const period = Math.max(2, Math.round(SR / f));
  const buf = Float32Array.from({ length: period }, () => noise());
  for (let i = 1; i < period; i++) buf[i] = bright * buf[i] + (1 - bright) * buf[i - 1];
  const d = 0.001 ** (1 / (dur * f * 1.5)); // se apaga a lo largo de la duración
  let idx = 0;
  play(at, dur, gain, (_, p) => {
    const a = buf[idx];
    buf[idx] = d * 0.5 * (a + buf[(idx + 1) % period]);
    idx = (idx + 1) % period;
    return a * Math.min(1, (1 - p) * 20); // sin chasquido al cortar
  });
};
// Cadencia andaluza: La m – Sol – Fa – Mi, un acorde por compás (posiciones abiertas de guitarra).
const CHORDS = [
  [45, 52, 57, 60, 64],
  [43, 47, 50, 55, 59, 67],
  [41, 48, 53, 57, 60, 65],
  [40, 47, 52, 56, 59, 64],
];
// Punteo por encima del acorde (pasos del compás 0, 3, 6, 10).
const MELODY = [
  [76, 74, 72, 74],
  [74, 71, 67, 71],
  [72, 69, 65, 69],
  [71, 68, 64, 68],
];
const strum = (at, notes, { up = false, gain = 0.12, dur = 0.55 } = {}) =>
  (up ? notes.slice(-4).reverse() : notes).forEach((n, i) => string(at + i * (up ? 0.008 : 0.013), n, dur, gain * (up ? 0.65 : 1)));
/** Rasgueado: cuatro golpes muy seguidos, como el final de una falseta. */
const rasgueado = (at, notes, gain = 0.1) => [0, 0.06, 0.12, 0.18].forEach((d, i) => strum(at + d, notes, { up: i % 2 === 1, gain, dur: 0.9 }));
const golpe = (at) => hiss(at, 0.05, 0.16, 60); // la mano que apaga las cuerdas
const cajonBass = (at, g = 0.75) => play(at, 0.28, g, (x) => Math.sin(TAU * (52 * x + 2.4 * (1 - Math.exp(-30 * x)))) * Math.exp(-13 * x));
const cajonSlap = (at, g = 0.3) => {
  hiss(at, 0.12, g, 28);
  tone(at, 0.08, g * 0.5, 190, 40);
};
/** Palmas: tres personas, nunca exactamente a la vez. */
const palmas = (at, g = 0.2) => [0, 0.009, 0.018].forEach((d, i) => hiss(at + d, 0.07, g * (1 - i * 0.2), 48));

// ── Efectos ──────────────────────────────────────────────────────────────────
const whoosh = (at, gain = 0.4) => {
  let lp = 0;
  play(at - 0.3, 0.7, gain, (_, p) => {
    lp += (0.03 + 0.4 * Math.sin(Math.PI * p)) * (noise() - lp);
    return lp * Math.sin(Math.PI * p) ** 2;
  });
};
/** Barajar: el rrrrr de los naipes antes de cada corte. */
const riffle = (at) => {
  for (let i = 0; i < 14; i++) hiss(at - 0.32 + i * 0.021, 0.018, 0.11 + i * 0.004, 110);
};
const snap = (at) => {
  hiss(at, 0.04, 0.24, 60);
  tone(at, 0.05, 0.12, 1700, 60);
};
const clack = (at) => [2200, 2950].forEach((f) => tone(at, 0.06, 0.12, f, 70));
const key = (at, i) => {
  hiss(at, 0.02, 0.07, 160);
  tone(at, 0.03, 0.05, 2300 + ((i * 137) % 600), 120);
};
const pop = (at, i = 0) => sweep(at, 0.12, 0.25, 500 + 70 * i, 1000 + 140 * i, 25);
const flip = (at) => {
  let lp = 0;
  play(at, 0.18, 0.35, (_, p) => {
    lp += 0.25 * (noise() - lp);
    return lp * Math.sin(Math.PI * p);
  });
};
const ding = (at) => [1318.5, 1975.5, 2637].forEach((f, i) => tone(at, 1.4, 0.15 / (i + 1), f, 4));
const coin = (at) => [0, 0.07].forEach((d) => [2637, 3951].forEach((f) => tone(at + d, 0.5, 0.09, f, 9)));
const stamp = (at) => {
  cajonBass(at, 0.9);
  hiss(at, 0.15, 0.3, 20);
};
const hit = (at) => {
  cajonBass(at, 1.1);
  tone(at, 0.9, 0.45, 41, 4);
  hiss(at, 0.5, 0.25, 8);
};
const heart = (at) => [0, 0.18].forEach((d, i) => play(at + d, 0.25, i ? 0.5 : 0.7, (x) => Math.sin(TAU * 50 * x) * Math.exp(-16 * x)));
const riser = (at, dur) => {
  let lp = 0;
  play(at, dur, 0.3, (_, p) => {
    lp += (0.02 + 0.5 * p * p) * (noise() - lp);
    return lp * p * p;
  });
  sweep(at, dur, 0.06, 200, 1600, -1.5);
};
/** Trombón triste: "wah, wah, wah, waaah". */
const sadTrombone = (at) =>
  [62, 61, 60, 59].forEach((n, i) => {
    const long = i === 3;
    play(at + i * 0.35, long ? 0.7 : 0.32, 0.16, (x, p) => {
      const vib = long ? 1 + 0.012 * Math.sin(TAU * 6 * x) : 1;
      return fat(TAU * hz(n) * vib * x) * Math.min(1, x * 30) * Math.min(1, (1 - p) * 8);
    });
  });

// ── Música ───────────────────────────────────────────────────────────────────
const [drop, finale] = [T.cuts[0], T.cuts.at(-1)];

// Intro: arpegio de La menor que crece mientras gira el reverso; golpe de rasgueado con el título.
CHORDS[0].concat([69, 72, 76]).forEach((n, i) => string(T.back + i * 0.12, n, 1.6, 0.09));
rasgueado(T.slam, CHORDS[0], 0.13);
[2, 2.5, 3, 3.5].forEach((t, i) => strum(t, CHORDS[0], { up: i % 2 === 1, gain: 0.1 }));
riser(drop - 1, 1);

/** Un compás de rumba: rasgueo, golpes, cajón y palmas. En el último de cada escena, rasgueado de remate. */
const bar = (t, chord, { fill = false, melody = false } = {}) => {
  const notes = CHORDS[chord];
  const root = notes[0];
  for (let s = 0; s < 16; s++) {
    const at = t + s * 0.125;
    const h = s % 8; // la rumba se repite cada medio compás
    if (fill && s >= 12) continue;
    if (h === 0) strum(at, notes, { gain: 0.13, dur: 0.8 });
    if (h === 4) strum(at, notes, { gain: 0.08 });
    if (h === 3 || h === 7) strum(at, notes, { up: true, gain: 0.1 });
    if (h === 2 || h === 6) golpe(at);
    if (s === 0 || s === 6 || s === 8) cajonBass(at);
    if (s === 4 || s === 12) {
      cajonSlap(at);
      palmas(at);
    }
    if (s === 7 || s === 11 || s === 15) palmas(at, 0.08);
    if (s === 0 || s === 8) tone(at, 0.45, 0.2, hz(root - 12), 5, fat);
  }
  if (fill) rasgueado(t + 1.5, notes, 0.12);
  if (melody) [0, 3, 6, 10].forEach((s, i) => string(t + s * 0.125, MELODY[chord][i], 0.7, 0.11, 0.8));
};
let chord = 0;
for (let t = drop; t < finale; t += 2) {
  if (t >= T.doubt && t < T.boom + 2) continue; // la duda y el chasco: sin música
  const next = t + 2;
  bar(t, chord, { fill: T.cuts.includes(next) || next === T.doubt, melody: t >= T.cuts[1] });
  chord = (chord + 1) % 4;
}

// Final: rasgueado en La menor con el título y acorde de Mi que se queda sonando.
rasgueado(finale, CHORDS[0], 0.13);
cajonBass(finale);
rasgueado(T.outroSlam, CHORDS[3], 0.12);
[T.cta, T.cta + 0.5, T.cta + 1].forEach((t, i) => {
  strum(t, CHORDS[i === 2 ? 0 : 3], { gain: i === 2 ? 0.15 : 0.1, dur: i === 2 ? 2.2 : 0.5 });
  palmas(t, 0.15);
});
[76, 72, 69, 64].forEach((n, i) => string(T.cta + 1.1 + i * 0.1, n, 1.6, 0.11, 0.8));

// ── Efectos, en los mismos tiempos que la animación ──────────────────────────
T.cuts.forEach((t) => {
  whoosh(t);
  riffle(t);
});
whoosh(T.back + 0.4, 0.3);
[T.slam, finale, T.outroSlam].forEach(hit);
[T.slam, T.outroSlam].forEach(ding);
T.code.forEach(snap);
T.players.forEach(clack);
pop(T.reader, 2);
T.typing.forEach((t, i) => T.question[i] !== ' ' && key(t, i));
T.unknown.forEach((t, i) => sweep(t, 0.28, 0.22, 760 - i * 60, 300, 7));
T.deal.forEach(snap);
T.flips.forEach((t, i) => {
  flip(t);
  stamp(t + 0.25);
  if (i === 0) ding(t + 0.3);
});
T.answers.forEach((t) => whoosh(t + 0.15, 0.2));
T.hunts.forEach((t) => {
  stamp(t);
  coin(t + 0.3);
});
T.beats.forEach(heart);
riser(T.boom - 0.8, 0.8);
hit(T.boom);
stamp(T.boom);
[0, 0.16].forEach((d) => tone(T.boom + 0.1 + d, 0.16, 0.18, 98, 3, square));
sadTrombone(T.boom + 0.6);
T.ranks.forEach((t, i) => {
  whoosh(t + 0.1, 0.2);
  // Los números giran como una tragaperras: un tic por cifra, cada vez más espaciados.
  const n = [7, 5, 4, 2][i]; // = RANKING en index.html
  for (let k = 1; k <= n; k++) key(t + 0.2 + 1.1 * (1 - (1 - k / n) ** (1 / 3)), k);
});
ding(T.crown);
coin(T.crown + 0.1);
pop(T.cta, 4);

// ── Máster: saturación suave, fundido final y WAV mono de 16 bits ─────────────
const wav = Buffer.alloc(44 + N * 2);
wav.write('RIFF', 0);
wav.writeUInt32LE(36 + N * 2, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); // PCM
wav.writeUInt16LE(1, 22); // mono
wav.writeUInt32LE(SR, 24);
wav.writeUInt32LE(SR * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(N * 2, 40);
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[i]));
for (let i = 0; i < N; i++) {
  const fade = Math.min(1, (N - i) / SR);
  wav.writeInt16LE(Math.round(Math.tanh(out[i] * 1.45) * fade * 0.92 * 32767), 44 + i * 2);
}
writeFileSync(new URL('./assets/soundtrack.wav', import.meta.url), wav);
console.log(`assets/soundtrack.wav: ${T.end}s, pico antes del máster ${peak.toFixed(2)}`);
