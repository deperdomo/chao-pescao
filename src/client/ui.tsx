// Piezas pequeñas de interfaz compartidas entre pantallas.
import { LoaderCircle } from 'lucide-react';

export function Loading({ text }: { text: string }) {
  return (
    <div className="text-muted flex min-h-40 items-center justify-center gap-2 p-6" role="status">
      <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
      {text}
    </div>
  );
}

export function Toast({ text }: { text: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4" role="status" aria-live="polite">
      {text && <p className="bg-naipe text-ink rounded-xl px-4 py-3 text-sm font-bold shadow-[0_10px_20px_-8px_#000d]">{text}</p>}
    </div>
  );
}

/** Palos de la baraja: cada naipe de una lista lleva el siguiente (clases de .naipe en index.css). */
export const SUITS = ['oros', 'copas', 'espadas', 'bastos'];

/** Sello de una respuesta: verdad o trola. */
export function Stamp({ truth }: { truth: boolean }) {
  return (
    <span
      className={`font-display shrink-0 -rotate-6 rounded-md border-2 px-1.5 text-xs tracking-wider uppercase ${
        truth ? 'border-truth text-truth' : 'border-lie text-lie'
      }`}
    >
      {truth ? 'Verdad' : 'Trola'}
    </span>
  );
}
