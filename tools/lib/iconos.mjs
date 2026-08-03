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

function dentroDeCirculo(x, y, cx, cy, radio) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radio * radio;
}

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

/**
 * Color del icono en el punto lógico `(x, y)`, con el lienzo de `tamano`.
 * @param {boolean} maskable Si es `true`, se omiten las asas: en un icono
 *   adaptable (Android o PWA) puede recortar cualquier cosa fuera del
 *   círculo central de seguridad, y las asas sobresalen de esa zona a
 *   propósito —son parte del gesto de "despertador de mesa" del logotipo—.
 */
function colorEnPunto(x, y, tamano, maskable) {
  const centro = tamano / 2;
  const radioEsfera = tamano * 0.3;

  // Aguja: del centro hacia la 1 en punto, como en el logotipo de la cabecera.
  const largoAguja = radioEsfera * 0.62;
  const anguloAguja = -Math.PI / 3; // -60°: arriba y a la derecha
  const puntaAgujaX = centro + Math.cos(anguloAguja) * largoAguja;
  const puntaAgujaY = centro + Math.sin(anguloAguja) * largoAguja;
  const grosorAguja = tamano * 0.028;

  if (distanciaASegmento(x, y, centro, centro, puntaAgujaX, puntaAgujaY) <= grosorAguja) {
    return TURQUESA;
  }

  if (dentroDeCirculo(x, y, centro, centro, radioEsfera)) {
    return BLANCO;
  }

  if (!maskable) {
    const grosorAsa = tamano * 0.045;
    // Mismo ángulo que las patas del logotipo de la cabecera (M4.5 4 7 6.2).
    const asas = [
      { ax: centro - radioEsfera * 1.28, ay: centro - radioEsfera * 1.55, bx: centro - radioEsfera * 0.62, by: centro - radioEsfera * 0.98 },
      { ax: centro + radioEsfera * 1.28, ay: centro - radioEsfera * 1.55, bx: centro + radioEsfera * 0.62, by: centro - radioEsfera * 0.98 },
    ];

    for (const asa of asas) {
      if (distanciaASegmento(x, y, asa.ax, asa.ay, asa.bx, asa.by) <= grosorAsa) {
        return AMARILLO;
      }
    }
  }

  return TURQUESA;
}

/* -------------------------------------------------------------------------- */
/*  Render con supermuestreo                                                  */
/* -------------------------------------------------------------------------- */

const SUPERMUESTREO = 4;

/**
 * @param {number} tamano Lado del lienzo cuadrado, en píxeles.
 * @param {{maskable?: boolean, radioRelativo?: number}} [opciones]
 *   `radioRelativo` reescala el dibujo dentro del lienzo sin cambiar `tamano`
 *   —lo usan los iconos adaptables de Android, cuyo lienzo (108dp) es más
 *   grande que la "zona segura" (66dp) que el sistema deja siempre visible—.
 */
export function renderizarIcono(tamano, { maskable = false, radioRelativo = 1 } = {}) {
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
            maskable,
          );
          r += cr;
          g += cg;
          b += cb;
          a += ca;
        }
      }

      const muestras = SUPERMUESTREO * SUPERMUESTREO;
      const indice = (ty * tamano + tx) * 4;
      rgba[indice] = Math.round(r / muestras);
      rgba[indice + 1] = Math.round(g / muestras);
      rgba[indice + 2] = Math.round(b / muestras);
      rgba[indice + 3] = Math.round(a / muestras);
    }
  }

  return rgba;
}
