// Worker: API para crear salas y WebSocket de cada sala. La web (Vercel) está en otro dominio: CORS abierto.
import { getServerByName, routePartykitRequest } from 'partyserver';
import { isValidName } from '../src/shared/game';
import { Room } from './room';

export { Room };

const CODE = /^[A-Z0-9]{6}$/;
const TOKEN = /^[\w-]{16,64}$/;
// Sin 0/O ni 1/I: el código se dicta en voz alta.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const randomCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => ALPHABET[b % ALPHABET.length]).join('');

// ponytail: CORS con *, sin cookies ni credenciales que proteger. Restringir al dominio de la web si se añaden.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...CORS } });

// ponytail: sin límite de peticiones propio. Si alguien abusa de crear salas,
// añadir una regla de Rate Limiting de Cloudflare sobre POST /api/rooms.
async function createRoom(request: Request, env: Env) {
  const body = (await request.json().catch(() => null)) as { token?: unknown; name?: unknown } | null;
  if (!body || typeof body.token !== 'string' || !TOKEN.test(body.token) || !isValidName(body.name)) {
    return json({ error: 'Solicitud no válida' }, 400);
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const room = await getServerByName(env.Room, code);
    if (await room.create(body.token, body.name.trim())) return json({ code });
  }
  return json({ error: 'No se pudo crear la sala' }, 500);
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/rooms') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
      if (request.method === 'POST') return createRoom(request, env);
      return json({ error: 'Método no permitido' }, 405);
    }
    // /parties/room/<código>: solo códigos con formato válido llegan a crear un Durable Object.
    const check = (_req: Request, lobby: { name: string }) =>
      CODE.test(lobby.name) ? undefined : new Response('Not found', { status: 404 });
    const response = await routePartykitRequest(request, env, { onBeforeConnect: check, onBeforeRequest: check });
    return response ?? new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
