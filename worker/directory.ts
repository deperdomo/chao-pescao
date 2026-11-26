// Directorio de salas abiertas (en espera), para la lista de la portada. Sin base de datos:
// un único Durable Object al que cada sala avisa cuando cambia.
import { DurableObject } from 'cloudflare:workers';

export interface OpenRoom {
  code: string;
  hostName: string;
  playerCount: number;
}

// Red de seguridad: una sala que no avisa en 6 h (se cayó sin cerrarse) deja de listarse.
const STALE = 6 * 3600_000;

// ponytail: una sola instancia para todas las salas. Si algún día hay miles a la vez, pasar a una base de datos.
export class Directory extends DurableObject<Env> {
  async set(code: string, room: OpenRoom | null) {
    if (room) await this.ctx.storage.put(code, { ...room, at: Date.now() });
    else await this.ctx.storage.delete(code);
  }

  async list(): Promise<OpenRoom[]> {
    const rows = await this.ctx.storage.list<OpenRoom & { at: number }>();
    const since = Date.now() - STALE;
    return [...rows.values()]
      .filter((r) => r.at >= since)
      .sort((a, b) => b.at - a.at)
      .slice(0, 50)
      .map(({ code, hostName, playerCount }) => ({ code, hostName, playerCount }));
  }
}

export const directory = (env: Env) => env.Directory.get(env.Directory.idFromName('all'));
