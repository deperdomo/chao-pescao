// Pantalla de partida: ronda, marcador, la pregunta y el panel de la fase (escribir, cazar, resultado).
import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, Trophy, WifiOff } from 'lucide-react';
import { ANSWER_MAX, type View } from '../shared/game';
import { Stamp, SUITS } from './ui';

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
          className={`flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-0.5 text-[15px] ${
            p.id === view.readerId ? 'border-oro bg-oro text-oro-ink font-bold' : 'bg-well border-white/15'
          }`}
        >
          <span className="max-w-24 truncate">{p.name}</span>
          {!p.connected && <WifiOff className="size-3.5" aria-label="desconectado" />}
          <span className="font-bold tabular-nums">
            {p.score}
            <span className="sr-only"> puntos{p.id === view.readerId ? ', lee la pregunta' : ''}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Tu papel y la respuesta real. Boca abajo hasta que la tocas: que no la lea quien tiene el móvil al lado. Mismo naipe para verdad y trola. */
function SecretCard({ view, onShow }: { view: View; onShow: () => void }) {
  const [shown, setShown] = useState(false);
  const truth = view.role === 'truth';
  const toggle = () => {
    if (!shown) onShow();
    setShown(!shown);
  };
  return (
    <button className={`block w-full rounded-xl text-left ${shown ? 'peek pr-2' : ''}`} onClick={toggle} aria-expanded={shown}>
      {/* key: al darle la vuelta se vuelve a montar y repite el giro */}
      {shown ? (
        <span key="front" className="naipe espadas flip block">
          <span className="text-muted flex items-center justify-between gap-2 text-sm font-bold">
            Respuesta real <EyeOff className="size-4" aria-label="Ocultar" />
          </span>
          <span className="font-display text-copas mt-1 block text-2xl leading-tight">{view.answer}</span>
          <span className="mt-2 block font-bold">
            {truth ? 'Te toca decir la VERDAD: ya la tienes escrita abajo; cámbiala si quieres.' : 'Te toca inventar una TROLA que suene creíble.'}
          </span>
        </span>
      ) : (
        <span key="back" className="cardback flip grid min-h-28 place-items-center">
          <span className="bg-naipe text-ink flex items-center gap-2 rounded-full px-4 py-2 font-bold shadow-[0_4px_10px_-4px_#000c]">
            <Eye className="size-5" aria-hidden="true" /> Toca para ver tu carta
          </span>
        </span>
      )}
    </button>
  );
}

function Progress({ view }: { view: View }) {
  return (
    <div role="status">
      <p className="text-muted text-sm font-bold">
        Respuestas: {view.done} de {view.writers}
      </p>
      <div className="bg-well mt-1.5 h-2 overflow-hidden rounded-full">
        <div className="bg-oro h-full rounded-full transition-[width]" style={{ width: `${(100 * view.done) / view.writers}%` }} />
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
        <div>
          <p className="font-display text-xl">Lee la pregunta en voz alta.</p>
          <p className="text-muted mt-1">
            Los demás conocen la respuesta: uno escribirá la verdad y el resto, trolas. Después te tocará cazarlas.
          </p>
        </div>
      ) : (
        <>
          {/* A quien dice la verdad se le escribe la respuesta real al ver la carta; puede cambiarla antes de enviar. */}
          <SecretCard view={view} onShow={() => view.role === 'truth' && !text && setText(view.answer ?? '')} />
          {view.mine && !editing ? (
            <div className="naipe oros">
              <p className="label">Tu respuesta</p>
              <p className="text-lg font-bold break-words">{view.mine}</p>
              <button className="btn btn-ghost mt-3 w-full" onClick={() => setEditing(true)}>
                Cambiarla
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
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

/** Una respuesta de la lista: un naipe del palo que le toca. Quien lee puede tocarla para elegirla. */
function Answer(props: { view: View; id: string; text: string; suit: string; picked?: boolean; onPick?: () => void }) {
  const { view, id, text, suit, picked, onPick } = props;
  const out = view.out.includes(id);
  const truth = view.truthId ? id === view.truthId : null; // solo se sabe al final
  const gone = out && view.phase === 'hunting';
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="text-muted truncate text-sm font-bold">
          {nameOf(view, id)}
          {id === view.you && ' (tú)'}
          {out && view.phase === 'result' && ' · descartada'}
        </span>
        {truth !== null ? <Stamp truth={truth} /> : out && <Stamp truth={false} />}
      </span>
      <span className={`mt-1 block text-lg font-bold break-words ${gone ? 'decoration-copas line-through decoration-[2.5px]' : ''}`}>{text}</span>
    </>
  );
  const box = `naipe ${suit} block w-full text-left ${picked ? 'picked' : ''} ${truth ? 'won' : ''} ${gone ? 'rotate-1 opacity-60' : ''}`;
  return onPick && !out ? (
    <button className={`${box} enabled:hover:-translate-y-0.5`} onClick={onPick} aria-pressed={picked}>
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
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <p>
            {isReader ? 'Llevas' : `${reader} lleva`}{' '}
            <strong className="font-display text-xl font-normal whitespace-nowrap tabular-nums">{points(view.bank)}</strong>
          </p>
          <p className="text-muted text-sm whitespace-nowrap">{left === 1 ? 'Queda 1 trola' : `Quedan ${left} trolas`}</p>
        </div>
        {/* Amarracos: uno de oro por trola cazada, uno vacío por cada trola que queda. */}
        <div className="mt-2 flex flex-wrap gap-1.5" aria-hidden="true">
          {Array.from({ length: view.bank + left }, (_, i) => (
            <i key={i} className={`token ${i < view.bank ? 'on' : ''}`} />
          ))}
        </div>
      </div>
      <p className="text-muted text-[15px]">
        {isReader
          ? 'Toca una respuesta para descartarla. Trola: +1. Si descartas la verdad, pierdes los puntos de la ronda.'
          : `${reader} va descartando respuestas. Si descarta la verdad, pierde los puntos de la ronda.`}
      </p>
      <ul className="flex flex-col gap-2.5">
        {view.answers.map((a, i) => (
          <li key={a.id}>
            <Answer
              view={view}
              id={a.id}
              text={a.text}
              suit={SUITS[i % 4]}
              picked={pick === a.id}
              onPick={isReader ? () => setPick(pick === a.id ? null : a.id) : undefined}
            />
          </li>
        ))}
      </ul>
      {isReader && (
        <div className="sticky bottom-0 -mx-4 mt-auto flex flex-col gap-2 bg-[linear-gradient(to_bottom,transparent,var(--color-felt)_1.5rem)] px-4 pt-6 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
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
      <div>
        <p className="font-display text-2xl leading-tight">{headline}</p>
        <p className={`mt-1 text-lg font-bold ${view.busted ? 'text-lie' : 'text-truth'}`}>
          {view.busted ? 'Pierde los puntos de esta ronda.' : `+${points(view.bank)}`}
        </p>
        <p className="text-muted mt-3 text-sm font-bold">Respuesta real</p>
        <p className="text-lg font-bold">{view.answer}</p>
      </div>
      <ul className="flex flex-col gap-2.5">
        {view.answers.map((a, i) => (
          <li key={a.id}>
            <Answer view={view} id={a.id} text={a.text} suit={SUITS[i % 4]} />
          </li>
        ))}
      </ul>
      <section aria-labelledby="ranking">
        <h2 id="ranking" className="label">
          {last ? 'Fin de la partida' : `Puntos · ronda ${view.round} de ${view.total}`}
        </h2>
        <ol className="divide-y divide-white/10">
          {ranking.map((p, i) => (
            <li key={p.id} className="flex min-h-10 items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                {last && i === 0 && <Trophy className="text-oro size-5 shrink-0" aria-hidden="true" />}
                <span className="truncate">{p.name}</span>
              </span>
              <span className="tabular-nums">
                {p.id === view.readerId && view.bank > 0 && <span className="text-truth mr-2 font-bold">+{view.bank}</span>}
                <strong className="font-display text-lg font-normal">{p.score}</strong>
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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between gap-2">
        <h1 className="font-display text-[22px] leading-none">
          Ronda {view.round} <span className="text-muted font-sans text-base font-bold">de {view.total}</span>
        </h1>
        <p
          className={`truncate rounded-full border-[1.5px] px-3 py-1 text-sm font-bold ${
            isReader ? 'border-oro bg-oro text-oro-ink' : 'border-white/35'
          }`}
        >
          {isReader ? 'Lees tú' : `Lee ${nameOf(view, view.readerId)}`}
        </p>
      </header>
      <Scores view={view} />
      <section className="frame" aria-label="Pregunta">
        <p className="text-[22px] leading-tight font-bold text-balance">{view.question}</p>
      </section>
      <div className="flex flex-1 flex-col gap-4" aria-live="polite">
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
