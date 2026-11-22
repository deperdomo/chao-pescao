---
name: Trola
description: Party game de preguntas raras y trolas, jugado sobre un tapete de mus con naipes de la baraja española.
colors:
  felt: "#0f3d30"
  well: "#0a2f24"
  naipe: "#fbf8f1"
  chalk: "#fdfaf2"
  ink: "#1f1a12"
  muted-felt: "#b9d6c8"
  muted-naipe: "#6d6453"
  oro: "#f2b705"
  oro-ink: "#251b00"
  copas: "#d7262e"
  espadas: "#1d4fa8"
  bastos: "#2f8a3c"
  lie-felt: "#ff8f87"
  lie-naipe: "#c41f27"
  truth-felt: "#7fdc8e"
  truth-naipe: "#23752f"
typography:
  display:
    fontFamily: "Ultra, Georgia, serif"
    fontSize: "64px"
    fontWeight: 400
    lineHeight: 1
  headline:
    fontFamily: "Ultra, Georgia, serif"
    fontSize: "24px"
    fontWeight: 400
    lineHeight: 1.25
  title:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.4
rounded:
  mini: "6px"
  frame: "7px"
  card: "12px"
  pill: "9999px"
spacing:
  tight: "6px"
  group: "12px"
  section: "16px"
  screen: "24px"
components:
  button-accent:
    backgroundColor: "{colors.oro}"
    textColor: "{colors.oro-ink}"
    rounded: "{rounded.card}"
    height: "48px"
    padding: "0 16px"
  button-accent-hover:
    backgroundColor: "#ffc61f"
  button-primary:
    backgroundColor: "{colors.naipe}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    height: "48px"
    padding: "0 16px"
  button-ghost:
    textColor: "{colors.chalk}"
    rounded: "{rounded.card}"
    height: "48px"
    padding: "0 16px"
  input:
    backgroundColor: "{colors.well}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.card}"
    height: "48px"
    padding: "0 12px"
  naipe:
    backgroundColor: "{colors.naipe}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "12px 16px"
  code-card:
    backgroundColor: "{colors.naipe}"
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
    rounded: "{rounded.mini}"
    width: "40px"
    height: "56px"
  score-chip:
    backgroundColor: "{colors.well}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.pill}"
    padding: "2px 12px"
  score-chip-reader:
    backgroundColor: "{colors.oro}"
    textColor: "{colors.oro-ink}"
---

# Design System: Trola

## Overview

**Creative North Star: "La mesa de mus"**

Trola se juega como se juega a las cartas en un bar: hay una mesa, y lo que tienes en la mano o lo que juzgas es una carta. El móvil es el tapete verde, y encima solo hay naipes de la baraja española. Las respuestas, tu carta secreta, el código de la sala y las vueltas son naipes de color crema. Cada uno lleva el marco del color de su palo y las «pintas», unos cortes en el marco que dicen el palo como en la baraja de verdad. Todo lo demás es fieltro y tiza.

Es un diseño oscuro porque se juega de noche, en casa o en un bar con poca luz. El contraste es alto y la letra es grande, porque juega gente de todas las edades. El oro es el único color de acción y marca siempre lo que toca hacer ahora. Lo único que se mueve es la carta secreta cuando se da la vuelta. El resto de estados cambian sin coreografía, porque el móvil se mira de un vistazo y se suelta.

Se rechazan expresamente el party game morado con degradado, las tarjetas blancas flotantes y los botones de caramelo.

**Key Characteristics:**
- Tapete verde punteado de fondo; naipes crema encima, con marco y pintas del palo.
- Un solo color de acción: el oro.
- Ultra para rótulos, código y números; Atkinson Hyperlegible para todo lo que se lee.
- El reverso de la baraja (rayas azules) para lo oculto y como marca.
- Los colores de texto cambian solos según estén sobre el tapete o sobre un naipe.

## Colors

Fieltro de mesa de bar, naipe crema y los cuatro palos de la baraja española. El oro sirve además como color de acción.

### Primary
- **Oro de la baraja** (oro): la acción de ahora. Se usa en el botón principal, el lector en el marcador, el borde de lo elegido, los amarracos ganados, el foco, la selección de texto y el cursor. El texto sobre oro va en **Tinta de oro** (oro-ink).

### Secondary
- **Rojo de copas** (copas): marco de los naipes de copas, la respuesta real en la carta secreta, las letras impares del código y el tachado de las respuestas descartadas.
- **Azul de espadas** (espadas): marco de los naipes de espadas y de la carta secreta, y rayas del reverso de la baraja.
- **Verde de bastos** (bastos): marco de los naipes de bastos y anillo de la respuesta verdadera en el resultado.

### Neutral
- **Tapete** (felt): fondo de toda la app, con un punteado blanco al 4% cada 4px que imita el fieltro.
- **Hueco del tapete** (well): campos de texto, fichas del marcador, la pista de la barra de progreso y el panel de la demo.
- **Naipe** (naipe): el fondo de todas las cartas y de los botones secundarios fuertes.
- **Tiza** (chalk): el texto sobre el tapete.
- **Tinta** (ink): el texto sobre un naipe.
- **Musgo** (muted-felt) y **Tinta gastada** (muted-naipe): texto secundario y etiquetas, sobre tapete y sobre naipe respectivamente.
- **Trola** (lie-felt / lie-naipe) y **Verdad** (truth-felt / truth-naipe): avisos de error, «Pierde los puntos», «+N puntos» y los sellos.

### Named Rules
**La regla del oro.** El oro marca solo lo que se hace ahora: un botón principal por pantalla, el lector y lo elegido. Si hay dos cosas doradas compitiendo, una de ellas sobra.

**La regla de las dos superficies.** El texto secundario, la trola y la verdad tienen dos valores, uno para el tapete y otro para el naipe. El naipe redefine las variables, así que el mismo componente se lee bien en los dos sitios (todos ≥5,4:1). No se ponen colores a mano dentro de un naipe.

**La regla de la carta secreta.** La carta secreta tiene el mismo aspecto para la verdad y para la trola: siempre es un naipe de espadas. El color no puede delatar el papel.

## Typography

**Display Font:** Ultra (with Georgia, serif)
**Body Font:** Atkinson Hyperlegible (with system-ui, sans-serif)

**Character:** Ultra es una egipcia muy negra, como la de las cajas de naipes: pone la voz de la mesa en el nombre, los titulares, el código y los números. Atkinson Hyperlegible se diseñó para que la lea bien cualquiera, a cualquier edad y con poca luz. Ojo: su cero va tachado a propósito, para no confundirlo con la O.

### Hierarchy
- **Display** (Ultra 400, 64px, 1): solo el nombre «Trola» en la portada, apoyado en un reverso de la baraja.
- **Headline** (Ultra 400, 20–24px, 1.25): «Ronda N», el titular del resultado, «Cómo se juega» y «Lee la pregunta en voz alta».
- **Title** (Atkinson 700, 22px, 1.25): la pregunta, dentro de su doble filete.
- **Body** (Atkinson 400–700, 17px, 1.5): respuestas (18px negrita), instrucciones y listas.
- **Label** (Atkinson 700, 14px): las etiquetas de los campos y de las secciones, en musgo.
- **Números** (Ultra 400): puntos acumulados, puntuaciones de la clasificación, cartas del código y vueltas. Dentro de las fichas pequeñas del marcador los números van en Atkinson negrita, porque Ultra no se lee a 15px.

### Named Rules
**La regla de un solo peso.** Ultra solo tiene peso 400 y la síntesis de negritas está desactivada, así que nunca se le pide un peso mayor. La jerarquía la dan el tamaño y el cambio de familia.

## Layout

Una sola columna de 448px como máximo, centrada y con márgenes laterales de 16px. Se diseña para el móvil en vertical, y en escritorio es la misma columna sobre el tapete. Dentro de cada grupo los elementos van a 6–12px; entre grupos de una pantalla hay 16px (en la partida) o 24px (en la sala y la portada). En partida, el botón de quien lee queda fijo abajo, sobre un degradado que se funde con el tapete, y respeta el área segura del sistema. En la sala, la elección de vueltas y «Empezar partida» van al pie, al alcance del pulgar.

Las secciones no van en cajas, sino sobre el tapete y separadas por espacio y por filetes de tiza al 10–15%. Solo hay caja cuando el objeto es una carta.

## Elevation & Depth

La profundidad es la de una mesa: los naipes descansan sobre el tapete con una sombra suave hacia abajo. Al elegir uno, se levanta (sube 4px y gira −1,2°) con un borde de oro de 3px. Al descartarlo, gira 1° y se apaga al 60%. No hay sombras de bloque sin desenfoque ni brillos de colores.

### Shadow Vocabulary
- **Naipe en la mesa** (`box-shadow: 0 8px 16px -8px #000d`): naipes, botones de oro y de naipe.
- **Naipe levantado** (`box-shadow: 0 0 0 3px oro, 0 16px 24px -10px #000`): respuesta elegida y vuelta seleccionada.
- **Carta del código** (`box-shadow: 0 6px 10px -4px #000c`): las seis cartas pequeñas del código.
- **Aviso** (`box-shadow: 0 10px 20px -8px #000d`): el aviso emergente y el panel de la demo.

## Shapes

El naipe tiene esquinas suaves (12px) y, dentro, un marco de 1,5px a 5px del borde con esquinas de 7px. Las pintas son huecos de 9×6px en el filete superior, a partir de 28px del borde izquierdo y cada 14px: oros ninguno, copas uno, espadas dos y bastos tres. Las cartas del código son más pequeñas (6px de radio y marco a 3px). Las fichas del marcador y la etiqueta de quién lee son píldoras. La pregunta va en un doble filete: borde de tiza al 30% y contorno al 15% a 4px de distancia.

## Components

### Buttons
Son botones de mesa: el de oro es la jugada y el de naipe la alternativa.
- **Shape:** esquinas de 12px y 48px de alto como mínimo.
- **Primary (acento):** fondo oro, texto en tinta de oro, Atkinson 17px negrita y sombra de naipe en la mesa. Al pasar por encima, un oro más claro (#ffc61f); al pulsar, se encoge al 98%.
- **Naipe:** fondo naipe con tinta. Es para la alternativa fuerte: «Unirse», «Plantarme», «Algo ha fallado».
- **Ghost:** transparente, con un borde del color del texto al 60%. Toma la tiza sobre el tapete y la tinta dentro de un naipe.
- **Disabled:** blanco al 8% con texto al 45%, sin sombra y sin color.
- **Focus:** contorno de oro de 3px separado 3px.

### Chips
- **Style:** píldora en el hueco del tapete con borde de tiza al 15%, el nombre y los puntos en negrita.
- **State:** quien lee va en oro con tinta de oro.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** naipe, con el marco del palo que le toque. En las listas el palo va por posición, en el orden oros, copas, espadas, bastos.
- **Shadow Strategy:** naipe en la mesa; levantado cuando está elegido.
- **Border:** el marco interior del palo, con sus pintas.
- **Internal Padding:** 12px × 16px.

### Inputs / Fields
- **Style:** hueco del tapete, borde de tiza al 40% de 1,5px, esquinas de 12px y texto de 17px (así iOS no hace zoom). El código de sala se escribe en Ultra, con letras espaciadas.
- **Focus:** contorno de oro de 3px; el cursor también es de oro.
- **Error:** mensaje en trola (lie) bajo el campo y aviso en un naipe de copas.

### Carta secreta
Boca abajo es el reverso de la baraja (rayas azules en diagonal con borde crema de 5px), con una etiqueta crema que dice «Toca para ver tu carta». Al tocarla gira (rotateY de 80° a 0 en 0,32s, con salida exponencial) y muestra un naipe de espadas con la respuesta real en Ultra rojo de copas. Detrás asoma el reverso, girado 3°.

### Código de sala
Son seis cartas pequeñas de 40×56px, una por carácter, en Ultra de 26px. Alternan rojo de copas (las impares, giradas −3°) y tinta (las pares, giradas 2°). Los lectores de pantalla leen el código entero.

### Amarracos
Son los puntos de la ronda: discos de 16px, uno por trola. Los ganados son de oro plano con un aro de oro oscuro; los que quedan, círculos de tiza con borde discontinuo.

### Sello
«Verdad» o «Trola» en Ultra de 12px en mayúsculas, con un borde de 2px del mismo color, girado −6° como un sello de goma.

## Do's and Don'ts

### Do:
- **Do** pon todo lo que se tiene o se juzga en un naipe crema con el marco de su palo; lo demás va sobre el tapete, sin caja.
- **Do** reserva el oro para la acción de ahora: un botón principal por pantalla.
- **Do** usa Ultra solo a 20px o más, y Atkinson negrita para los números pequeños.
- **Do** usa los colores que cambian según la superficie (secundario, trola, verdad) en lugar de poner colores a mano dentro de un naipe.
- **Do** acompaña siempre el color de verdad o trola con texto (sello o frase), nunca el color solo.
- **Do** respeta `prefers-reduced-motion`: el giro de la carta se apaga.

### Don't:
- **Don't** vuelvas al morado con degradado, las tarjetas blancas flotantes ni los botones de caramelo.
- **Don't** pintes la carta secreta de un color distinto para la verdad y para la trola.
- **Don't** pidas a Ultra un peso distinto de 400 ni la uses para párrafos.
- **Don't** imites el volumen con degradados (fichas esféricas, relieves): los amarracos y los naipes son planos e impresos.
- **Don't** uses emoji como iconos: los iconos son de lucide, del mismo trazo.
