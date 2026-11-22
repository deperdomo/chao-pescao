// Sala de espera: código para compartir y jugadores. Tras una partida, muestra la clasificación.
import { useState } from 'react';
import { Check, Crown, Share2, Trophy, WifiOff, X } from 'lucide-react';
import { LAP_CHOICES, MAX_PLAYERS, MIN_PLAYERS, type View } from '../shared/game';
import { store } from './session';
import { SUITS } from './ui';
import type { RoomConn } from './useRoom';

interface Props {
  room: RoomConn;
  view: View;
  onLeave: () => void;
}

export default function Lobby({ room, view, onLeave }: Props) {
  const [copied, setCopied] = useState(false);
  const [laps, setLaps] = useState(() => LAP_CHOICES.find((n) => String(n) === store.get('laps')) ?? 2); // se recuerda para la próxima partida
  const pickLaps = (n: number) => {
    setLaps(n);
    store.set('laps', String(n));
  };
  const host = view.players.find((p) => p.id === view.hostId);
  const isHost = view.you === view.hostId;
  const missing = MIN_PLAYERS - view.players.length;
  const hasScores = view.players.some((p) => p.score !== 0);
  const players = hasScores ? [...view.players].sort((a, b) => b.score - a.score) : view.players;
  const best = Math.max(...view.players.map((p) => p.score));

  const share = async () => {
    const url = `${location.origin}/?sala=${view.code}`;
    try {
      if (navigator.share) return await navigator.share({ title: 'Trola', text: 'Únete a mi sala de Trola', url });
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // compartir cancelado, o sin permiso de portapapeles: el código sigue a la vista
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-4">
      <header className="text-center">
        <h1 className="text-muted text-sm font-bold">Sala de espera · código</h1>
        {/* El código, repartido en seis cartas. */}
        <p className="mt-3 flex justify-center gap-1.5">
          <span className="sr-only">{view.code}</span>
          {[...view.code].map((c, i) => (
            <span key={i} className={`mini ${i % 2 ? 'rotate-2' : 'text-copas -rotate-3'}`} aria-hidden="true">
              {c}
            </span>
          ))}
        </p>
        <button className="btn btn-ghost mt-5 w-full" onClick={share}>
          {copied ? <Check className="size-5" aria-hidden="true" /> : <Share2 className="size-5" aria-hidden="true" />}
          {copied ? 'Enlace copiado' : 'Invitar con un enlace'}
        </button>
      </header>

      <section aria-labelledby="players-title">
        <h2 id="players-title" className="label">
          {hasScores ? 'Clasificación de la última partida' : `Jugadores (${view.players.length}/${MAX_PLAYERS})`}
        </h2>
        <ul className="divide-y divide-white/10">
          {players.map((p) => (
            <li key={p.id} className="flex min-h-12 items-center gap-3">
              <span className="min-w-0 flex-1 truncate font-bold">
                {p.name}
                {p.id === view.you && <span className="text-muted font-normal"> (tú)</span>}
              </span>
              {hasScores && (
                <span className="flex items-center gap-1.5 tabular-nums">
                  {p.score === best && <Trophy className="text-oro size-5" aria-hidden="true" />}
                  <strong className="font-display text-lg font-normal">{p.score}</strong> <span className="text-muted text-sm">pts</span>
                </span>
              )}
              {!p.connected && <WifiOff className="text-muted size-4" aria-label="Desconectado" />}
              {p.id === view.hostId && <Crown className="text-oro size-5" aria-label="Anfitrión" />}
              {isHost && p.id !== view.you && (
                <button
                  className="text-muted hover:text-chalk grid size-11 place-items-center rounded-lg hover:bg-white/10"
                  onClick={() => room.send({ t: 'kick', id: p.id })}
                  aria-label={`Sacar a ${p.name} de la sala`}
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-auto flex flex-col gap-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {isHost ? (
          <>
            <div>
              <p id="laps-title" className="label">
                Vueltas: cuántas veces lee cada jugador
              </p>
              <div className="mt-2 grid grid-cols-3 gap-3" role="radiogroup" aria-labelledby="laps-title">
                {LAP_CHOICES.map((n, i) => (
                  <button
                    key={n}
                    role="radio"
                    aria-checked={laps === n}
                    className={`naipe ${SUITS[i % 4]} font-display min-h-14 text-center text-2xl ${laps === n ? 'picked' : ''}`}
                    onClick={() => pickLaps(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-muted mt-3 text-sm" role="status">
                Con {view.players.length} jugadores: {view.players.length * laps} rondas.
              </p>
            </div>
            <button className="btn btn-accent w-full" onClick={() => room.send({ t: 'start', laps })} disabled={missing > 0}>
              {hasScores ? 'Jugar otra partida' : 'Empezar partida'}
            </button>
            {missing > 0 && (
              <p className="text-muted text-center text-sm" role="status">
                {missing === 1 ? 'Falta 1 jugador' : `Faltan ${missing} jugadores`} para empezar (mínimo {MIN_PLAYERS}).
              </p>
            )}
          </>
        ) : (
          <p className="text-muted text-center" role="status">
            Esperando a que {host?.name ?? 'el anfitrión'} empiece la partida…
          </p>
        )}
        <button className="btn btn-ghost w-full" onClick={onLeave}>
          {isHost ? 'Cerrar la sala' : 'Salir de la sala'}
        </button>
      </footer>
    </main>
  );
}
