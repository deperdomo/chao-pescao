// Pantalla de partida: ronda, marcador, la pregunta y el panel de la fase (escribir, cazar, resultado).
import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, WifiOff } from 'lucide-react';
import { ANSWER_MAX, type View } from '../shared/game';
import { Stamp } from './ui';

interface PhaseProps {
  view: View;
  send: (msg: object) => void;
}

const nameOf = (view: View, id: string) => view.players.find((p) => p.id === id)?.name ?? '?';
const points = (n: number) => `${n} ${n === 1 ? 'punto' : 'puntos'}`;

function Scores({ view }: { view: View }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Marcador">
      {view.players.map((p) => (
        <li
          key={p.id}
          className={`flex min-h-8 items-center gap-1.5 rounded-lg border px-2 py-0.5 text-sm ${
            p.id === view.readerId ? 'border-ink bg-ink text-paper font-bold' : 'border-line bg-paper'
          }`}
        >
          <span className="max-w-24 truncate">{p.name}</span>
          {!p.connected && <WifiOff className="size-3.5" aria-label="desconectado" />}
          <span className="tabular-nums opacity-75">
            {p.score}
            <span className="sr-only"> puntos{p.id === view.readerId ? ', lee la pregunta' : ''}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Tu papel y la respuesta real. Oculta hasta que la tocas: que no la lea quien tiene el móvil al lado. Mismo color para verdad y trola. */
function SecretCard({ view }: { view: View }) {
  const [shown, setShown] = useState(false);
  const truth = view.role === 'truth';
  return (
    <button className="bg-ink text-paper w-full rounded-2xl p-4 text-left" onClick={() => setShown(!shown)} aria-expanded={shown}>
      {shown ? (
        <>
          <span className="flex items-center justify-between gap-2 text-sm font-semibold opacity-80">
            Respuesta real <EyeOff className="size-4" aria-label="Ocultar" />
          </span>
          <span className="mt-1 block text-2xl font-black">{view.answer}</span>
          <span className="mt-3 block font-bold">
            {truth ? 'Te toca decir la VERDAD: escríbela con tus palabras.' : 'Te toca inventar una TROLA que suene creíble.'}
          </span>
        </>
      ) : (
        <span className="flex items-center gap-2 font-bold">
          <Eye className="size-5" aria-hidden="true" /> Toca para ver tu carta
        </span>
      )}
    </button>
  );
}

function Progress({ view }: { view: View }) {
  return (
    <div role="status">
      <p className="text-muted text-sm font-semibold">
        Respuestas: {view.done} de {view.writers}
      </p>
      <div className="bg-soft mt-1 h-2 overflow-hidden rounded-full">
        <div className="bg-ink h-full transition-[width]" style={{ width: `${(100 * view.done) / view.writers}%` }} />
      </div>
    </div>
  );
}

function Writing({ view, send }: PhaseProps) {
  const [text, setText] = useState(view.mine);
  const [editing, setEditing] = useState(false);
  const isReader = view.you === view.readerId;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    send({ t: 'write', text });
    setEditing(false);
  };
  const skip = () => {
    if (confirm('¿Seguir sin las respuestas que faltan? Si falta la verdad, saldrá otra pregunta.')) send({ t: 'skip' });
  };

  return (
    <>
      {isReader ? (
        <div className="card">
          <p className="text-lg font-black">Lee la pregunta en voz alta.</p>
          <p className="text-muted mt-1">
            Los demás conocen la respuesta: uno escribirá la verdad y el resto, trolas. Después te tocará cazarlas.
          </p>
        </div>
      ) : (
        <>
          <SecretCard view={view} />
          {view.mine && !editing ? (
            <div className="card">
              <p className="label">Tu respuesta</p>
              <p className="text-lg font-bold break-words">{view.mine}</p>
              <button className="btn btn-ghost mt-3 w-full" onClick={() => setEditing(true)}>
                Cambiarla
              </button>
            </div>
          ) : (
            <form className="card" onSubmit={submit}>
              <label className="label" htmlFor="answer">
                Tu respuesta
              </label>
              <input
                id="answer"
                className="input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={ANSWER_MAX}
                autoComplete="off"
                required
              />
              <button className="btn btn-accent mt-3 w-full" disabled={!text.trim()}>
                Enviar
              </button>
            </form>
          )}
        </>
      )}
      <Progress view={view} />
      {view.you === view.hostId && view.done < view.writers && (
        <button className="text-muted min-h-11 text-sm underline" onClick={skip}>
          Seguir sin esperar
        </button>
      )}
    </>
  );
}

/** Una respuesta de la lista. Quien lee puede tocarla para elegirla. */
function Answer(props: { view: View; id: string; text: string; picked?: boolean; onPick?: () => void }) {
  const { view, id, text, picked, onPick } = props;
  const out = view.out.includes(id);
  const truth = view.truthId ? id === view.truthId : null; // solo se sabe al final
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="text-muted truncate text-sm font-semibold">
          {nameOf(view, id)}
          {id === view.you && ' (tú)'}
          {out && view.phase === 'result' && ' · descartada'}
        </span>
        {truth !== null ? <Stamp truth={truth} /> : out && <Stamp truth={false} />}
      </span>
      <span className={`mt-1 block text-lg font-bold break-words ${out && view.phase === 'hunting' ? 'line-through opacity-60' : ''}`}>
        {text}
      </span>
    </>
  );
  const box = `card block w-full text-left ${picked ? 'ring-ink ring-4' : ''} ${truth ? 'border-truth border-[3px]' : ''}`;
  return onPick && !out ? (
    <button className={`${box} enabled:hover:bg-chip`} onClick={onPick} aria-pressed={picked}>
      {body}
    </button>
  ) : (
    <div className={box}>{body}</div>
  );
}

function Hunting({ view, send }: PhaseProps) {
  const [pick, setPick] = useState<string | null>(null);
  const isReader = view.you === view.readerId;
  const reader = nameOf(view, view.readerId);
  const left = view.answers.length - 1 - view.out.length;
  const readerGone = !view.players.find((p) => p.id === view.readerId)?.connected;

  useEffect(() => {
    if (isReader) navigator.vibrate?.(200);
  }, [isReader]);

  const discard = () => {
    send({ t: 'discard', id: pick });
    setPick(null);
  };
  const stopFor = () => {
    if (confirm(`¿Plantar a ${reader} con ${points(view.bank)}?`)) send({ t: 'stop' });
  };

  return (
    <>
      <div className="card flex items-baseline justify-between gap-2">
        <p>
          {isReader ? 'Llevas' : `${reader} lleva`} <strong className="text-xl tabular-nums">{points(view.bank)}</strong>
        </p>
        <p className="text-muted text-sm">{left === 1 ? 'Queda 1 trola' : `Quedan ${left} trolas`}</p>
      </div>
      <p className="text-muted px-1 text-sm">
        {isReader
          ? 'Toca una respuesta para descartarla. Trola: +1. Si descartas la verdad, pierdes los puntos de la ronda.'
          : `${reader} va descartando respuestas. Si descarta la verdad, pierde los puntos de la ronda.`}
      </p>
      <ul className="flex flex-col gap-2">
        {view.answers.map((a) => (
          <li key={a.id}>
            <Answer view={view} id={a.id} text={a.text} picked={pick === a.id} onPick={isReader ? () => setPick(pick === a.id ? null : a.id) : undefined} />
          </li>
        ))}
      </ul>
      {isReader && (
        <div className="bg-desk sticky bottom-0 -mx-4 mt-auto flex flex-col gap-2 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {pick ? (
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button className="btn btn-accent" onClick={discard}>
                Descartar la de {nameOf(view, pick)}
              </button>
              <button className="btn btn-ghost" onClick={() => setPick(null)}>
                Cancelar
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={() => send({ t: 'stop' })}>
              Plantarme con {points(view.bank)}
            </button>
          )}
        </div>
      )}
      {!isReader && readerGone && view.you === view.hostId && (
        <button className="text-muted min-h-11 text-sm underline" onClick={stopFor}>
          {reader} se ha desconectado: plantarle
        </button>
      )}
    </>
  );
}

function Result({ view, send }: PhaseProps) {
  const isReader = view.you === view.readerId;
  const reader = nameOf(view, view.readerId);
  const clean = !view.busted && view.out.length === view.answers.length - 1;
  const last = view.round >= view.total;
  const ranking = [...view.players].sort((a, b) => b.score - a.score);
  const headline = view.busted
    ? `¡${reader} ha descartado la verdad!`
    : clean
      ? `¡${reader} ha cazado todas las trolas!`
      : `${reader} se planta`;

  return (
    <>
      <div className="card">
        <p className="text-2xl font-black">{headline}</p>
        <p className={`mt-1 text-lg font-bold ${view.busted ? 'text-lie' : 'text-truth'}`}>
          {view.busted ? 'Pierde los puntos de esta ronda.' : `+${points(view.bank)}`}
        </p>
        <p className="text-muted mt-3 text-sm font-semibold">Respuesta real</p>
        <p className="text-lg font-bold">{view.answer}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {view.answers.map((a) => (
          <li key={a.id}>
            <Answer view={view} id={a.id} text={a.text} />
          </li>
        ))}
      </ul>
      <section className="card" aria-labelledby="ranking">
        <h2 id="ranking" className="label">
          {last ? 'Fin de la partida' : `Puntos · ronda ${view.round} de ${view.total}`}
        </h2>
        <ol className="flex flex-col gap-1">
          {ranking.map((p, i) => (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <span className="truncate">
                {last && i === 0 && '🏆 '}
                {p.name}
              </span>
              <span className="tabular-nums">
                {p.id === view.readerId && view.bank > 0 && <span className="text-truth mr-2 font-bold">+{view.bank}</span>}
                <strong>{p.score}</strong>
              </span>
            </li>
          ))}
        </ol>
      </section>
      {isReader || view.you === view.hostId ? (
        <button className="btn btn-accent mt-auto" onClick={() => send({ t: 'next' })}>
          {last ? 'Volver a la sala' : 'Siguiente ronda'}
        </button>
      ) : (
        <p className="text-muted mt-auto text-center" role="status">
          Esperando a que {reader} pase a la siguiente ronda…
        </p>
      )}
    </>
  );
}

export default function Game({ view, send }: PhaseProps) {
  const isReader = view.you === view.readerId;
  const abort = () => {
    if (confirm('¿Terminar la partida y volver a la sala de espera?')) send({ t: 'abort' });
  };
  const phase = { view, send };
  const key = `${view.round}:${view.question}`; // estado de cada panel nuevo en cada pregunta

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-3 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="flex items-baseline justify-between gap-2">
        <h1 className="text-xl font-black">
          Ronda {view.round} <span className="text-muted text-base font-semibold">de {view.total}</span>
        </h1>
        <p className="truncate text-sm font-semibold">{isReader ? 'Lees tú' : `Lee ${nameOf(view, view.readerId)}`}</p>
      </header>
      <Scores view={view} />
      <section className="card" aria-label="Pregunta">
        <p className="text-2xl leading-tight font-black text-balance">{view.question}</p>
      </section>
      <div className="flex flex-1 flex-col gap-3" aria-live="polite">
        {view.phase === 'writing' && <Writing key={key} {...phase} />}
        {view.phase === 'hunting' && <Hunting key={key} {...phase} />}
        {view.phase === 'result' && <Result key={key} {...phase} />}
      </div>
      {view.you === view.hostId && (
        <button className="text-muted min-h-11 text-sm underline" onClick={abort}>
          Terminar la partida
        </button>
      )}
    </main>
  );
}
