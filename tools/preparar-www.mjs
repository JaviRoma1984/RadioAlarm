/**
 * RadioAlarm · Prepara www/ para el envoltorio Android (Capacitor)
 *
 * Capacitor empaqueta dentro del APK lo que sea que haya en `webDir`, sin
 * ningún filtro propio. Copiar la raíz del proyecto tal cual metería en la
 * app cosas que no pintan nada ahí —`tests/`, `tools/`, `docs/`,
 * `node_modules/`, el propio `.git`—, así que este script copia a `www/`
 * solo lo que la aplicación necesita en tiempo de ejecución.
 *
 * Se ejecuta antes de `npx cap sync` (ver `npm run build:www`):
 *
 *     node tools/preparar-www.mjs
 */

import { cpSync, rmSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = join(RAIZ, "www");

const ARCHIVOS = ["index.html", "manifest.webmanifest", "sw.js"];
const CARPETAS = ["css", "js", "icons"];

rmSync(DESTINO, { recursive: true, force: true });
mkdirSync(DESTINO, { recursive: true });

for (const archivo of ARCHIVOS) {
  cpSync(join(RAIZ, archivo), join(DESTINO, archivo));
}

for (const carpeta of CARPETAS) {
  cpSync(join(RAIZ, carpeta), join(DESTINO, carpeta), { recursive: true });
}

console.log(`www/ preparada con: ${[...ARCHIVOS, ...CARPETAS].join(", ")}`);
