// Portada: crear sala, unirse con código o pedir entrar en una sala abierta.
// El título y el "cómo se juega" son HTML estático en index.html.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ChevronRight, Users } from 'lucide-react';
import { isValidName, MAX_PLAYERS, NAME_MAX } from '../shared/game';
import { SERVER_HOST, store, token, type Session } from './session';
import { SUITS } from './ui';

const API = `${location.protocol}//${SERVER_HOST}/api/rooms`;

const NAME_RULE = `Escribe un nombre de 2 a ${NAME_MAX} caracteres`;

interface OpenRoom {
  code: string;
  hostName: string;
  playerCount: number;
}

interface Props {
  notice: string;
  initialCode: string;
  onEnter: (session: Session) => void;
}

export default function Home({ notice, initialCode, onEnter }: Props) {
  const [name, setName] = useState(() => store.get('name'));
  const [code, setCode] = useState(initialCode);
  const [nameError, setNameError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rooms, setRooms] = useState<OpenRoom[] | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const askName = useRef<HTMLDialogElement>(null);
  const afterName = useRef<(player: string) => void>(() => {});
  const [askError, setAskError] = useState('');

  // Salas abiertas: refresco cada 5 s mientras la pestaña está visible.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(API);
        if (res.ok && alive) setRooms(((await res.json()) as { rooms: OpenRoom[] }).rooms);
      } catch {
        // se reintenta en el siguiente ciclo
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  /** Nombre validado y recordado, o null (con el error a la vista y el foco en el campo). */
  const validName = (): string | null => {
    if (isValidName(name)) {
      store.set('name', name.trim());
      return name.trim();
    }
    setNameError(NAME_RULE);
    nameInput.current?.focus();
    return null;
  };

  /** Para entrar en una sala: con nombre válido sigue; si no, lo pide en una ventana y sigue al aceptarla. */
  const withName = (next: (player: string) => void) => {
    const typed = name.trim();
    if (isValidName(name)) {
      store.set('name', name.trim());
      return next(name.trim());
    }
    afterName.current = next;
    setAskError(typed ? NAME_RULE : '');
    askName.current?.showModal();
  };

  const confirmName = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidName(name)) return setAskError(NAME_RULE);
    store.set('name', name.trim());
    askName.current?.close();
    afterName.current(name.trim());
  };

  const create = async () => {
    const player = validName();
    if (!player || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token(), name: player }),
      });
      const data = (await res.json()) as { code?: string; error?: string };
      if (!res.ok || !data.code) throw new Error(data.error);
      onEnter({ code: data.code, name: player, mode: 'join' });
    } catch (e) {
      setError((e instanceof Error && e.message) || 'No se pudo crear la sala. Inténtalo de nuevo.');
      setBusy(false);
    }
  };

  const join = (e: FormEvent) => {
    e.preventDefault();
    if (!/^[A-Z0-9]{6}$/.test(code)) return setCodeError('El código tiene 6 letras o números');
    withName((player) => onEnter({ code, name: player, mode: 'join' }));
  };

  const request = (room: OpenRoom) =>
    withName((player) => onEnter({ code: room.code, name: player, mode: 'request' }));

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 pt-8 pb-6">
      {(notice || error) && (
        <p className="naipe copas font-bold" role="alert">
          {notice || error}
        </p>
      )}
      {initialCode && !notice && (
        <p className="naipe oros" role="status">
          Te han invitado a la sala <strong className="tracking-wider">{initialCode}</strong>. Escribe tu nombre y entra.
        </p>
      )}

      <div>
        <label className="label" htmlFor="name">
          Tu nombre
        </label>
        <input
          id="name"
          ref={nameInput}
          className="input"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setNameError('');
          }}
          maxLength={NAME_MAX}
          autoComplete="nickname"
          autoFocus={!!initialCode}
          aria-invalid={!!nameError}
          aria-describedby={nameError ? 'name-error' : undefined}
        />
        {nameError && (
          <p id="name-error" className="text-lie mt-1.5 text-sm font-bold" role="alert">
            {nameError}
          </p>
        )}
        <button className="btn btn-accent mt-4 w-full" onClick={create} disabled={busy}>
          {busy ? 'Creando sala…' : 'Crear sala'}
        </button>
      </div>

      <form className="border-t border-white/15 pt-6" onSubmit={join} noValidate>
        <label className="label" htmlFor="code">
          ¿Tienes un código de sala?
        </label>
        <div className="flex gap-2">
          <input
            id="code"
            className="input font-display text-xl tracking-[0.3em] uppercase"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
              setCodeError('');
            }}
            placeholder="ABC123"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={!!codeError}
            aria-describedby={codeError ? 'code-error' : undefined}
          />
          <button className="btn btn-primary shrink-0">Unirse</button>
        </div>
        {codeError && (
          <p id="code-error" className="text-lie mt-1.5 text-sm font-bold" role="alert">
            {codeError}
          </p>
        )}
      </form>

      <section className="border-t border-white/15 pt-6" aria-labelledby="open-rooms">
        <h2 id="open-rooms" className="label">
          Salas abiertas
        </h2>
        {!rooms?.length ? (
          <p className="text-muted text-sm">{rooms ? 'No hay salas abiertas ahora mismo.' : 'Buscando salas…'}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-3">
            {rooms.map((room, i) => (
              <li key={room.code}>
                <button
                  className={`naipe ${SUITS[i % 4]} flex w-full items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60`}
                  onClick={() => request(room)}
                  disabled={room.playerCount >= MAX_PLAYERS}
                >
                  <span className="min-w-0 flex-1 truncate font-bold">Sala de {room.hostName}</span>
                  <span className="text-muted flex shrink-0 items-center gap-1 text-sm font-bold tabular-nums">
                    <Users className="size-4" aria-hidden="true" />
                    {room.playerCount}/{MAX_PLAYERS}
                    <span className="sr-only"> jugadores. Pedir entrar</span>
                    <ChevronRight className="size-5" aria-hidden="true" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Nombre al entrar en una sala sin haberlo escrito: un trozo de tapete. Al abrirse, el foco va al campo. */}
      <dialog
        ref={askName}
        className="m-auto w-[calc(100%-2rem)] max-w-sm bg-transparent backdrop:bg-black/70"
        aria-labelledby="ask-title"
        onClose={() => setAskError('')}
      >
        <form
          className="bg-felt text-chalk rounded-2xl border-[1.5px] border-white/30 p-5 shadow-[0_16px_32px_-12px_#000]"
          onSubmit={confirmName}
          noValidate
        >
          <h2 id="ask-title" className="font-display text-xl">
            ¿Cómo te llamas?
          </h2>
          <p className="text-muted mt-1 mb-3 text-sm">Así te verán los demás en la sala.</p>
          <input
            className="input"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setAskError('');
            }}
            maxLength={NAME_MAX}
            autoComplete="nickname"
            aria-label="Tu nombre"
            aria-invalid={!!askError}
            aria-describedby={askError ? 'ask-error' : undefined}
          />
          {askError && (
            <p id="ask-error" className="text-lie mt-1.5 text-sm font-bold" role="alert">
              {askError}
            </p>
          )}
          <div className="mt-5 flex gap-2">
            <button type="button" className="btn btn-ghost flex-1" onClick={() => askName.current?.close()}>
              Cancelar
            </button>
            <button className="btn btn-accent flex-1">Entrar</button>
          </div>
        </form>
      </dialog>
    </main>
  );
}
