/**
 * RadioAlarm · Generador de iconos
 *
 * No hay ImageMagick, sharp ni ninguna otra herramienta de conversión de
 * imágenes instalada en esta máquina, así que este script escribe archivos
 * PNG directamente con lo que ya trae Node: el módulo `zlib` para la
 * compresión que exige el formato, y aritmética de más de toda la vida (CRC32
 * manual, chunks a mano) para el resto. Cero dependencias, igual que la
 * propia aplicación.
 *
 * El icono se dibuja píxel a píxel con geometría simple (círculos y
 * distancia punto-segmento para las asas y la aguja), a 4x el tamaño final y
 * reducido después promediando cada bloque de 4×4 —un filtro de caja
 * sencillo que hace de antialiasing—.
 *
 * Se ejecuta una vez, a mano, cuando hace falta regenerar los iconos:
 *
 *     node tools/generar-iconos.mjs
 */

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const CARPETA_ICONOS = join(dirname(fileURLToPath(import.meta.url)), "..", "icons");

/* -------------------------------------------------------------------------- */
/*  Colores de marca                                                          */
/* -------------------------------------------------------------------------- */

const TURQUESA = [29, 184, 154, 255];
const AMARILLO = [245, 194, 0, 255];
const BLANCO = [247, 250, 249, 255];

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
function codificarPng(ancho, alto, rgba) {
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
 *   adaptable Android puede recortar cualquier cosa fuera del círculo central
 *   de seguridad, y las asas sobresalen de esa zona a propósito —son parte
 *   del gesto de "despertador de mesa" del logotipo—.
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

function renderizarIcono(tamano, { maskable = false } = {}) {
  const grande = tamano * SUPERMUESTREO;
  const rgba = new Uint8Array(tamano * tamano * 4);

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
          // La geometría está definida en el espacio lógico (0..tamano), así
          // que el punto supermuestreado se reescala antes de clasificarlo.
          const [cr, cg, cb, ca] = colorEnPunto(
            (xGrande / grande) * tamano,
            (yGrande / grande) * tamano,
            tamano,
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

/* -------------------------------------------------------------------------- */
/*  Generación de los archivos                                                */
/* -------------------------------------------------------------------------- */

const ICONOS = [
  { archivo: "favicon-16.png", tamano: 16 },
  { archivo: "favicon-32.png", tamano: 32 },
  { archivo: "apple-touch-icon.png", tamano: 180 },
  { archivo: "icon-192.png", tamano: 192 },
  { archivo: "icon-512.png", tamano: 512 },
  { archivo: "icon-512-maskable.png", tamano: 512, maskable: true },
];

mkdirSync(CARPETA_ICONOS, { recursive: true });

for (const { archivo, tamano, maskable } of ICONOS) {
  const rgba = renderizarIcono(tamano, { maskable });
  const png = codificarPng(tamano, tamano, rgba);
  writeFileSync(join(CARPETA_ICONOS, archivo), png);
  console.log(`${archivo}  (${tamano}×${tamano}, ${png.length} bytes)`);
}
