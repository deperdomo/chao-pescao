# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Grupos de 3 a 15 personas, de todas las edades, que juegan juntos cada uno con su móvil. La escena principal es
de noche: en casa (salón, terraza, luz baja) o en un bar o evento (ruido, poca luz, gente de pie). Cada jugador
mira su pantalla de un vistazo entre risas y vuelve a la conversación; el que lee la pregunta la lee en voz alta.

## Product Purpose

Trola es un party game de preguntas raras: uno lee la pregunta sin saber la respuesta; de los demás, uno escribe
la verdad y el resto se inventan una trola. Quien lee caza trolas (+1 cada una) y puede plantarse; si descarta la
verdad, pierde los puntos de la ronda. El éxito es que la gente hable, se ría y defienda su trola con cara de
póquer; el móvil es solo el tablero.

## Positioning

Se juega sin instalar nada ni registrarse: una sala con código de 6 caracteres o un enlace, cada uno en su
navegador. La mecánica de roles ocultos (una verdad, muchas trolas, un lector que caza) obliga a hablar y a
mentir en persona; las respuestas escritas permiten jugar también por llamada.

## Operating Context

- Pantallas: portada (crear sala / unirse con código, más "cómo se juega" en HTML estático), sala de espera
  (código, invitar, jugadores, vueltas, empezar), partida (escribir, cazar, resultado) y fin de partida.
- `/demo` monta las pantallas reales con jugadores simulados para probarlas desde un solo dispositivo.
- Móviles en vertical, a menudo con una mano, con brillo bajo y en sitios con poca luz o mucho ruido.
- La carta secreta tiene el mismo aspecto para verdad y trola y está oculta hasta tocarla, para que el vecino
  no la adivine mirando su pantalla.

## Capabilities and Constraints

- Web estática (Vite + React + Tailwind) en Vercel; servidor de salas en Cloudflare Worker. Sin base de datos.
- La web no tiene lógica de juego: pinta la vista que manda el servidor y envía acciones.
- Español de España, tono coloquial. Constantes de juego en `src/shared/game.ts`.

## Brand Commitments

- El nombre **Trola**.
- **Las preguntas y los textos de la interfaz ya están escritos y no se cambian** (mazo en `worker/questions.ts`,
  copy de las pantallas y de `index.html`). El rediseño cambia la forma, no las palabras.
- Todo lo visual (logo, colores, tipografías) puede cambiar.

## Evidence on Hand

- Mazo real de preguntas en `worker/questions.ts` (solo en el servidor) y mazo de 5 preguntas de la demo en
  `src/client/Demo.tsx`.
- No hay testimonios, cifras de uso ni prensa: no inventarlos.

## Product Principles

- La conversación es el juego: el móvil se lee de un vistazo y se suelta.
- Nadie debe poder adivinar los roles mirando la pantalla de al lado.
- Nunca bloquear la partida: siempre hay una salida (seguir sin esperar, plantar, terminar).
- Entrar en diez segundos: un nombre y un código, nada más.

## Accessibility & Inclusion

Todas las edades: texto grande y contraste alto en ambientes oscuros, objetivos táctiles de 44px o más, sin
depender solo del color para verdad/trola, y respeto a `prefers-reduced-motion`.
