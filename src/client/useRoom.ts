// Conexión con la sala: un WebSocket que reconecta solo (partysocket) y el estado que envía el servidor.
import { useCallback, useEffect, useRef, useState } from 'react';
import PartySocket from 'partysocket';
import type { ServerMsg, View } from '../shared/game';
import { SERVER_HOST, token, type Session } from './session';

export interface RoomConn {
  view: View | null;
  online: boolean;
  toast: string;
  send: (msg: object) => void;
}

export function useRoom(session: Session, onExit: (msg: string, wasInside: boolean) => void): RoomConn {
  const [view, setView] = useState<View | null>(null);
  const [online, setOnline] = useState(false);
  const [toast, setToast] = useState('');
  const socketRef = useRef<PartySocket | null>(null);
  const exit = useRef(onExit);
  exit.current = onExit;

  useEffect(() => {
    let inside = false;
    const socket = new PartySocket({
      host: SERVER_HOST,
      party: 'room',
      room: session.code,
      query: { token: token(), name: session.name },
    });
    socketRef.current = socket;
    socket.addEventListener('open', () => setOnline(true));
    socket.addEventListener('close', () => setOnline(false));
    socket.addEventListener('message', (e) => {
      const m = JSON.parse(e.data as string) as ServerMsg;
      if (m.t === 'state') {
        inside = true;
        setView(m.s);
      } else if (m.t === 'toast') {
        setToast(m.msg);
      } else if (m.t === 'closed') {
        socket.close(); // no reconectar
        exit.current(m.msg, inside);
      }
    });
    return () => socket.close();
  }, [session.code, session.name]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  const send = useCallback((msg: object) => socketRef.current?.send(JSON.stringify(msg)), []);
  return { view, online, toast, send };
}
