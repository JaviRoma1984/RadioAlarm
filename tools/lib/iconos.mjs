/**
 * RadioAlarm · Dibujo del icono de marca (compartido)
 *
 * El mismo círculo turquesa con las asas amarillas y la aguja del logotipo
 * de la cabecera (`index.html`), pero dibujado píxel a píxel en vez de como
 * SVG, para poder escribirlo directamente a PNG sin depender de ninguna
 * herramienta de imagen —no hay ninguna instalada en esta máquina—.
 *
 * Lo usan `generar-iconos.mjs` (los de la PWA, en `icons/`) y
 * `generar-iconos-android.mjs` (los del envoltorio nativo, en
 * `android/app/src/main/res/`): mismo dibujo, tamaños distintos.
 */

import { deflateSync } from "node:zlib";

/* -------------------------------------------------------------------------- */
/*  Colores de marca                                                          */
/* -------------------------------------------------------------------------- */

export const TURQUESA = [29, 184, 154, 255];
export const AMARILLO = [245, 194, 0, 255];
export const BLANCO = [247, 250, 249, 255];

/* -------------------------------------------------------------------------- */
/*  Codificador PNG mínimo                                                    */
/* -------------------------------------------------------------------------- */

let tablaCrc = null;

function crc32(buffer) {
  if (!tablaCrc) {
    tablaCrc = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      tablaCrc[n] = c >>> 0;
    }
  }

  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = tablaCrc[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function trozo(tipo, datos) {
  const longitud = Buffer.alloc(4);
  longitud.writeUInt32BE(datos.length);

  const tipoYDatos = Buffer.concat([Buffer.from(tipo, "ascii"), datos]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(tipoYDatos));

  return Buffer.concat([longitud, tipoYDatos, crc]);
}

/**
 * Codifica una imagen RGBA en un PNG real.
 * @param {number} ancho
 * @param {number} alto
 * @param {Uint8Array} rgba Longitud `ancho * alto * 4`.
 * @returns {Buffer}
 */
export function codificarPng(ancho, alto, rgba) {
  const firma = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0);
  ihdr.writeUInt32BE(alto, 4);
  ihdr[8] = 8; // 8 bits por canal
  ihdr[9] = 6; // color type 6 = RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Cada fila lleva un byte de filtro por delante; se usa el filtro 0 (ninguno).
  const stride = ancho * 4;
  const sinFiltrar = Buffer.alloc((stride + 1) * alto);
  for (let fila = 0; fila < alto; fila += 1) {
    const desde = fila * stride;
    sinFiltrar[fila * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + desde, stride).copy(
      sinFiltrar,
      fila * (stride + 1) + 1,
    );
  }

  const idat = deflateSync(sinFiltrar, { level: 9 });

  return Buffer.concat([
    firma,
    trozo("IHDR", ihdr),
    trozo("IDAT", idat),
    trozo("IEND", Buffer.alloc(0)),
  ]);
}

/* -------------------------------------------------------------------------- */
/*  Geometría                                                                 */
/* -------------------------------------------------------------------------- */

/** Distancia de un punto al segmento a↔b, para dibujar las asas y la aguja. */
function distanciaASegmento(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const largo2 = dx * dx + dy * dy;

  const t = largo2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / largo2));
  const cercaX = ax + t * dx;
  const cercaY = ay + t * dy;

  return Math.hypot(px - cercaX, py - cercaY);
}

const TRANSPARENTE = [0, 0, 0, 0];

/**
 * El logotipo, con las mismas coordenadas que el SVG de la cabecera en
 * `index.html` —un `viewBox` de 24×24, trazo de grosor 2—, para que el icono
 * de la app y el que se ve dentro de ella sean literalmente el mismo dibujo:
 *
 *     <path d="M4.5 4 7 6.2M19.5 4 17 6.2" stroke="amarillo" />
 *     <circle cx="12" cy="13.5" r="7.5"   stroke="turquesa" />
 *     <path  d="M12 10v3.5l2.25 1.5"      stroke="turquesa" />
 *
 * Es un dibujo de líneas, no de rellenos: el círculo es una circunferencia
 * hueca, no un disco. Antes el icono era un cuadro turquesa macizo con una
 * esfera blanca dentro, que no se parecía al logotipo más que de lejos.
 */
const DISENO = {
  /** Lado del `viewBox` original. */
  lado: 24,
  /** Mitad del grosor de trazo (`stroke-width: 2`). */
  trazo: 1,
  circulo: { cx: 12, cy: 13.5, r: 7.5 },
  aguja: [
    { ax: 12, ay: 10, bx: 12, by: 13.5 },
    { ax: 12, ay: 13.5, bx: 14.25, by: 15 },
  ],
  asas: [
    { ax: 4.5, ay: 4, bx: 7, by: 6.2 },
    { ax: 19.5, ay: 4, bx: 17, by: 6.2 },
  ],
  /** Caja que ocupa el dibujo con su trazo, para centrarlo y escalarlo. */
  centroX: 12,
  centroY: 12.5,
  alto: 19,
};

/**
 * Color del icono en el punto lógico `(x, y)`, con el lienzo de `tamano`.
 *
 * El punto se lleva primero al espacio del `viewBox` de 24×24, y ahí se
 * compara contra la geometría del logotipo: así las proporciones son las del
 * SVG y no hay que recalcularlas por tamaño.
 *
 * @param {number[]|null} fondo Color de relleno del lienzo, o `null` para
 *   dejarlo transparente —lo que necesita el primer plano de un icono
 *   adaptable de Android, que pone su fondo por debajo—.
 */
function colorEnPunto(x, y, tamano, fondo) {
  const escala = tamano / DISENO.alto;
  const dx = (x - tamano / 2) / escala + DISENO.centroX;
  const dy = (y - tamano / 2) / escala + DISENO.centroY;

  for (const asa of DISENO.asas) {
    if (distanciaASegmento(dx, dy, asa.ax, asa.ay, asa.bx, asa.by) <= DISENO.trazo) return AMARILLO;
  }

  // Circunferencia, no disco: solo pinta el anillo del grosor del trazo.
  const { cx, cy, r } = DISENO.circulo;
  if (Math.abs(Math.hypot(dx - cx, dy - cy) - r) <= DISENO.trazo) return TURQUESA;

  for (const tramo of DISENO.aguja) {
    if (distanciaASegmento(dx, dy, tramo.ax, tramo.ay, tramo.bx, tramo.by) <= DISENO.trazo) {
      return TURQUESA;
    }
  }

  return fondo ?? TRANSPARENTE;
}

/* -------------------------------------------------------------------------- */
/*  Render con supermuestreo                                                  */
/* -------------------------------------------------------------------------- */

const SUPERMUESTREO = 4;

/**
 * @param {number} tamano Lado del lienzo cuadrado, en píxeles.
 * @param {{fondo?: number[]|null, radioRelativo?: number}} [opciones]
 *   `fondo` rellena el lienzo por detrás del dibujo (`null` lo deja
 *   transparente). `radioRelativo` reescala el dibujo dentro del lienzo sin
 *   cambiar `tamano` —lo usan los iconos adaptables de Android, cuyo lienzo
 *   (108dp) es más grande que la "zona segura" (66dp) que el sistema deja
 *   siempre visible—.
 */
export function renderizarIcono(tamano, { fondo = null, radioRelativo = 1 } = {}) {
  const grande = tamano * SUPERMUESTREO;
  const rgba = new Uint8Array(tamano * tamano * 4);
  // radioRelativo < 1 encoge el dibujo dentro del lienzo, centrado, dejando
  // un margen alrededor —el propio lienzo (`tamano`) no cambia—.
  const tamanoLogico = tamano * radioRelativo;
  const desplazamiento = (tamano - tamanoLogico) / 2;

  for (let ty = 0; ty < tamano; ty += 1) {
    for (let tx = 0; tx < tamano; tx += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SUPERMUESTREO; sy += 1) {
        for (let sx = 0; sx < SUPERMUESTREO; sx += 1) {
          const xGrande = tx * SUPERMUESTREO + sx + 0.5;
          const yGrande = ty * SUPERMUESTREO + sy + 0.5;
          // La geometría está definida en el espacio lógico (0..tamanoLogico);
          // el punto supermuestreado se reescala y recentra antes de
          // clasificarlo, para poder "encoger" el dibujo dentro de un lienzo
          // más grande (radioRelativo < 1) sin rehacer las proporciones.
          const [cr, cg, cb, ca] = colorEnPunto(
            (xGrande / grande) * tamano - desplazamiento,
            (yGrande / grande) * tamano - desplazamiento,
            tamanoLogico,
            null,
          );
          r += cr;
          g += cg;
          b += cb;
          a += ca;
        }
      }

      // Las muestras son o totalmente opacas o totalmente transparentes, así
      // que la media de r/g/b ya es el color premultiplicado por alfa. Hay que
      // tratarlo como tal: dividir por el alfa al guardar (o componer sobre el
      // fondo) en vez de escribirlo en crudo, que es lo que oscurecería los
      // bordes del trazo al mezclarlos con el negro del transparente.
      const muestras = SUPERMUESTREO * SUPERMUESTREO;
      const indice = (ty * tamano + tx) * 4;
      const alfa = a / muestras;
      const premultiplicado = [r / muestras, g / muestras, b / muestras];

      if (fondo) {
        const opacidad = alfa / 255;
        for (let canal = 0; canal < 3; canal += 1) {
          rgba[indice + canal] = Math.round(premultiplicado[canal] + fondo[canal] * (1 - opacidad));
        }
        rgba[indice + 3] = 255;
      } else {
        for (let canal = 0; canal < 3; canal += 1) {
          rgba[indice + canal] = alfa === 0 ? 0 : Math.round((premultiplicado[canal] * 255) / alfa);
        }
        rgba[indice + 3] = Math.round(alfa);
      }
    }
  }

  return rgba;
}
