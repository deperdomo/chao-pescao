import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import Home from './client/Home';
import RoomScreen from './client/RoomScreen';
import { codeFromUrl, roomPath, store, type Session } from './client/session';
import { Loading } from './client/ui';

// /demo: las pantallas reales con jugadores simulados. Se descarga solo al abrirla.
const Demo = lazy(() => import('./client/Demo'));
const isDemo = location.pathname === '/demo';

const TITLE = document.title;

/** Si algo revienta al pintar, un mensaje y un botón en vez de una pantalla en blanco. */
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error(error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="mx-auto max-w-md p-6 text-center" role="alert">
        <h1 className="text-xl font-bold">Algo ha fallado</h1>
        <p className="text-muted mt-2">Recarga la página: si estabas en una partida, volverás a tu sitio.</p>
        <button className="btn btn-primary mt-4" onClick={() => location.reload()}>
          Recargar
        </button>
      </main>
    );
  }
}

export default function App() {
  // Enlace con ?sala=CÓDIGO y nombre ya conocido: entra directo (o recupera su asiento tras recargar).
  const [session, setSession] = useState<Session | null>(() => {
    const code = codeFromUrl();
    const name = store.get('name');
    return code && name ? { code, name } : null;
  });
  const [notice, setNotice] = useState('');
  const [code, setCode] = useState(codeFromUrl);

  useEffect(() => {
    document.body.classList.toggle('in-room', !!session || isDemo);
    document.title = isDemo ? 'Demo · Trola' : session ? `Sala ${session.code} · Trola` : TITLE;
  }, [session]);

  useEffect(() => {
    // Botón "atrás" del navegador: salir de la sala.
    const onPop = () => !codeFromUrl() && setSession(null);
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);

  const enter = (next: Session) => {
    history.pushState(null, '', roomPath(next.code));
    setNotice('');
    setSession(next);
  };
  const exit = (msg: string, wasInside: boolean) => {
    history.replaceState(null, '', roomPath());
    setNotice(msg);
    // Si no llegó a entrar (nombre repetido, sala llena...), el código se queda escrito para reintentar.
    setCode(wasInside ? '' : (session?.code ?? ''));
    setSession(null);
  };

  return (
    <ErrorBoundary>
      {isDemo ? (
        <Suspense fallback={<Loading text="Cargando la demo…" />}>
          <Demo />
        </Suspense>
      ) : session ? (
        <RoomScreen key={session.code} session={session} onExit={exit} />
      ) : (
        <Home notice={notice} initialCode={code} onEnter={enter} />
      )}
    </ErrorBoundary>
  );
}
