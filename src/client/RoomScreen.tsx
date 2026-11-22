// Todo lo que pasa dentro de una sala.
import { useEffect } from 'react';
import Game from './Game';
import Lobby from './Lobby';
import type { Session } from './session';
import { Loading, Toast } from './ui';
import { useRoom } from './useRoom';

interface Props {
  session: Session;
  onExit: (msg: string, wasInside: boolean) => void;
}

export default function RoomScreen({ session, onExit }: Props) {
  const room = useRoom(session, onExit);
  const { view } = room;

  // La pantalla no se apaga mientras esperas (donde el navegador lo permita).
  useEffect(() => {
    if (!view || !navigator.wakeLock) return;
    let lock: WakeLockSentinel | undefined;
    const acquire = () => {
      if (!document.hidden) navigator.wakeLock.request('screen').then((l) => (lock = l), () => {});
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      document.removeEventListener('visibilitychange', acquire);
      lock?.release();
    };
  }, [!!view]);

  if (!view) return <Loading text="Conectando con la sala…" />;

  const leave = () => {
    room.send({ t: 'leave' });
    onExit('', true);
  };

  return (
    <>
      {!room.online && (
        <p className="bg-naipe text-ink fixed inset-x-0 top-0 z-50 p-2 text-center text-sm font-bold" role="status">
          Sin conexión. Reconectando…
        </p>
      )}
      {view.phase === 'lobby' ? <Lobby room={room} view={view} onLeave={leave} /> : <Game view={view} send={room.send} />}
      <Toast text={room.toast} />
    </>
  );
}
