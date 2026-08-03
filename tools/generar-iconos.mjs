/**
 * RadioAlarm · Generador de iconos (PWA)
 *
 * No hay ImageMagick, sharp ni ninguna otra herramienta de conversión de
 * imágenes instalada en esta máquina, así que este script escribe archivos
 * PNG directamente con lo que ya trae Node —ver `tools/lib/iconos.mjs`, con
 * el codificador PNG y el dibujo del icono, compartidos con
 * `generar-iconos-android.mjs`—.
 *
 * Se ejecuta una vez, a mano, cuando hace falta regenerar los iconos:
 *
 *     node tools/generar-iconos.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { codificarPng, renderizarIcono } from "./lib/iconos.mjs";

const CARPETA_ICONOS = join(dirname(fileURLToPath(import.meta.url)), "..", "icons");

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
