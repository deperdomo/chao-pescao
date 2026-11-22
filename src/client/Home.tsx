// Portada: crear sala o unirse con código. El título y el "cómo se juega" son HTML estático en index.html.
import { useRef, useState, type FormEvent } from 'react';
import { isValidName, NAME_MAX } from '../shared/game';
import { SERVER_HOST, store, token, type Session } from './session';

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
  const nameInput = useRef<HTMLInputElement>(null);

  /** Nombre validado y recordado, o null (con el error a la vista y el foco en el campo). */
  const validName = (): string | null => {
    if (isValidName(name)) {
      store.set('name', name.trim());
      return name.trim();
    }
    setNameError(`Escribe un nombre de 2 a ${NAME_MAX} caracteres`);
    nameInput.current?.focus();
    return null;
  };

  const create = async () => {
    const player = validName();
    if (!player || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${location.protocol}//${SERVER_HOST}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token(), name: player }),
      });
      const data = (await res.json()) as { code?: string; error?: string };
      if (!res.ok || !data.code) throw new Error(data.error);
      onEnter({ code: data.code, name: player });
    } catch (e) {
      setError((e instanceof Error && e.message) || 'No se pudo crear la sala. Inténtalo de nuevo.');
      setBusy(false);
    }
  };

  const join = (e: FormEvent) => {
    e.preventDefault();
    const player = validName();
    if (!player) return;
    if (!/^[A-Z0-9]{6}$/.test(code)) return setCodeError('El código tiene 6 letras o números');
    onEnter({ code, name: player });
  };

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
    </main>
  );
}
