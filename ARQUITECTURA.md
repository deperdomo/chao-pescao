# Trola: reglas y arquitectura

## Reglas

- De 3 a 15 jugadores, cada uno con su móvil. El anfitrión crea la sala y comparte el código o el enlace.
- En cada ronda hay un **lector**, que lee en voz alta una pregunta rara sin saber la respuesta.
- Los demás ven la respuesta real y una carta secreta: a uno le toca **verdad** (la escribe con sus palabras) y
  al resto **trola** (se inventan una respuesta creíble). La verdad le toca a alguien conectado si lo hay.
- Cuando todos han escrito, aparecen todas las respuestas con el nombre de su autor.
- El lector descarta respuestas de una en una:
  - Trola: +1 punto para la ronda.
  - Verdad: pierde los puntos de **esa ronda** (no los de la partida) y la ronda termina.
  - Puede **plantarse** cuando quiera y se queda lo que lleva.
  - Si caza todas las trolas, la ronda termina sola con todos los puntos.
- Solo puntúa el lector. Lee el siguiente jugador en el orden de la sala.
- Cada jugador lee **1, 2 o 3 veces** (`LAP_CHOICES`): lo elige el anfitrión en la sala de espera antes de
  empezar (2 por defecto; el móvil recuerda la última elección). Con muchos jugadores conviene 1 vuelta: con 15
  jugadores y 2 vueltas salen 30 rondas. Al final, la clasificación queda en la sala de espera y el anfitrión
  puede empezar otra partida (los puntos vuelven a 0).
- Para no atascarse:
  - El anfitrión puede **seguir sin esperar** a quien no escribe. Si ya están la verdad y al menos una trola,
    se caza sin los que faltan; si no, sale otra pregunta para el mismo lector.
  - Si el lector se desconecta mientras caza, el anfitrión puede plantarle.
  - El anfitrión puede terminar la partida en cualquier momento y volver a la sala de espera.
- Solo se puede entrar, salir o expulsar a alguien en la sala de espera. Si el anfitrión cierra la sala, se
  cierra para todos.

Las constantes (`MIN_PLAYERS`, `MAX_PLAYERS`, `LAP_CHOICES`, `ANSWER_MAX`…) están al principio de
`src/shared/game.ts`.

## Arquitectura

```
Móvil (web en Vercel)  ──POST /api/rooms──▶  Worker (Cloudflare)  ──▶  Durable Object "Room" (uno por sala)
        ▲                                                                    │
        └──────────── WebSocket /parties/room/<código> ◀─────────────────────┘
```

- **Web** (`src/`): React + Tailwind, construida con Vite como web estática (`dist/`) y publicada en
  **Vercel**. No tiene lógica de juego: muestra la vista que le manda el servidor y envía acciones.
  `VITE_SERVER_HOST` (en `.env.production`) le dice dónde está el servidor de salas.
- **Servidor de salas** (`worker/`): Cloudflare Worker con Durable Objects mediante `partyserver`, el mismo
  patrón que Trazo.
  - `worker/index.ts`: `POST /api/rooms` crea una sala con un código de 6 caracteres sin 0/O ni 1/I, y enruta
    los WebSocket a su sala. CORS abierto porque la web está en otro dominio.
  - `worker/room.ts`: un Durable Object por sala. Aplica las reglas, guarda el estado en su storage y manda a
    cada jugador solo lo que puede ver. Si la sala se queda sin nadie, se borra a los 2 minutos en la sala de
    espera o a los 30 minutos con la partida empezada.
  - `worker/questions.ts`: el mazo de preguntas con su respuesta. Solo lo carga el servidor, así que la
    respuesta no aparece en el código de la web.
- **Reglas** (`src/shared/game.ts`): lógica pura que comparten el servidor y la web (la web solo usa tipos y
  constantes). Cada acción cambia la sala y devuelve un mensaje de error o nada. `viewFor()` decide qué ve
  cada jugador: el lector nunca recibe la respuesta ni quién dice la verdad hasta el final de la ronda.
  Check: `npm test` (`src/shared/game.test.ts`).
- **Identidad**: cada navegador guarda un token aleatorio en `localStorage`. Con él recupera su sitio al
  recargar o reconectar, en cualquier fase.
- **Sin base de datos**: la partida vive entera en el Durable Object. Si algún día hace falta (lista de salas
  abiertas, historial), está la instancia compartida bd-juegos del servidor de Oracle, como en Trazo.

### Demo (`/demo`)

`src/client/Demo.tsx` monta las pantallas reales con 5 jugadores simulados, sin servidor: la sala vive en
memoria y pasa por las mismas funciones de `src/shared/game.ts`. Los bots escriben sus respuestas y, si no lees
tú, cazan trolas (se plantan con 2 puntos). Pasar de ronda lo decides tú. El panel "Demo" permite:

- **Ver como**: cambiar de jugador (anfitrión, lector, quien dice la verdad…).
- **Ir a**: saltar a sala de espera, escribiendo, cazando, resultado, descartó la verdad o fin de partida.

Usa un mazo propio de 5 preguntas para que la web siga sin llevar las respuestas del mazo real. Se descarga
aparte, solo al abrir `/demo`. En Vercel la ruta la sirve el rewrite de `vercel.json`; en desarrollo, la
config de assets del plugin de Cloudflare en `vite.config.ts`.

### Mensajes

Del cliente al servidor (JSON por el WebSocket): `start {laps}`, `write {text}`, `skip`, `discard {id}`, `stop`,
`next`, `abort`, `kick {id}` y `leave`.

Del servidor al cliente: `state` (la vista completa de ese jugador), `toast` (un error para mostrar) y
`closed` (fuera de la sala, no reconectar).

### Dominios

| Qué | Dónde | Configurado en |
| --- | --- | --- |
| Web | `trola.deiviperdomo.dev` (Vercel) | proyecto de Vercel + CNAME en Cloudflare sin proxy |
| Servidor de salas | `trola-api.deiviperdomo.dev` (Cloudflare) | `wrangler.jsonc`, `.env.production`, CSP de `vercel.json` |

## Decisiones tomadas

- **Nombre propio** (Trola) en vez de Chao Pescao!, que es un juego comercial: mismas mecánicas, con preguntas
  y diseño propios.
- **Respuestas escritas en el móvil**, no en voz alta: así se puede jugar también por llamada, y todos ven las
  respuestas y las descartadas.
- **El progreso de las respuestas solo muestra cuántos han escrito, no quiénes**: el que acaba primero suele ser
  el que dice la verdad.
- **La carta secreta tiene el mismo color para verdad y trola** y está oculta hasta que la tocas, para que el
  lector no lo adivine mirando la pantalla de al lado.
- **No hay lista de salas abiertas** (Trazo sí la tiene), porque necesita base de datos.
