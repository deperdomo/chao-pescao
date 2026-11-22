# Trola

Party game de preguntas raras para jugar cada uno con su móvil. Uno lee la pregunta sin saber la respuesta;
de los demás, uno escribe la verdad y el resto se inventan una trola. Quien lee caza trolas (+1 cada una) y
puede plantarse; si descarta la verdad, pierde los puntos de la ronda.

- `src/`: la web (React + Tailwind). Se despliega en **Vercel**.
- `worker/`: el servidor de salas (Cloudflare Worker + Durable Objects con partyserver, como Trazo) y el mazo
  de preguntas (`worker/questions.ts`, solo en el servidor para que no se pueda mirar la respuesta en la web).
- `src/shared/game.ts`: las reglas. Check: `npm test`.

Sin base de datos: la partida vive en el Durable Object de la sala. Reglas completas, arquitectura y
decisiones: [ARQUITECTURA.md](ARQUITECTURA.md).

## Desarrollo

```sh
npm install
npm run dev          # web + servidor de salas en el mismo Vite
```

Para probar el juego solo: `/demo` (jugadores simulados, sin servidor). Con jugadores de verdad
en varias pestañas del mismo navegador: `?dev=2`, `?dev=3`… dan otra identidad.
Con móviles en la misma wifi: `npm run dev -- --host` y abrir la IP que muestra Vite.

## Despliegue

**Servidor de salas** (Cloudflare, dominio `trola-api.deiviperdomo.dev` en `wrangler.jsonc`):

```sh
npx wrangler login   # una vez
npm run deploy:server
```

**Web** (Vercel): importar el repo; detecta Vite (`npm run build`, salida `dist`). `.env.production`
apunta la web al servidor de salas. Dominio: añadir `trola.deiviperdomo.dev` en el proyecto de Vercel y, en el
DNS de Cloudflare, un CNAME `trola` → `cname.vercel-dns.com` **sin proxy** (nube gris).

Si cambias el dominio del servidor, cámbialo en `wrangler.jsonc`, `.env.production` y la CSP de `vercel.json`.
