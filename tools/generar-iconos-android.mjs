/**
 * RadioAlarm · Iconos del envoltorio Android
 *
 * `npx cap add android` deja unos iconos genéricos de Capacitor en las
 * carpetas `mipmap-...` (`ic_launcher.png` y compañía): este script los
 * sustituye por el mismo dibujo de marca que ya usan la PWA y la cabecera
 * de la app —ver
 * `tools/lib/iconos.mjs`, compartido con `generar-iconos.mjs`—.
 *
 * Android usa dos formatos a la vez, y los dos llevan el dibujo completo
 * —círculo, aguja y asas—, que es el mismo del logotipo de la cabecera:
 *   - Icono clásico (`ic_launcher`/`ic_launcher_round`): para API 24-25, con
 *     su propio fondo blanco, a un tamaño por densidad (48/72/96/144/192 px).
 *   - Icono adaptable (API 26+, `ic_launcher_foreground` sobre el color de
 *     `values/ic_launcher_background.xml`): el primer plano va transparente,
 *     porque el fondo lo pone el sistema por debajo. Su lienzo es de 108dp
 *     pero solo los 66dp centrales están siempre visibles —el lanzador
 *     recorta el resto con la forma que le dé la gana—, así que el dibujo se
 *     encoge a esa proporción para que no se coman las asas.
 *
 * Se ejecuta una vez, a mano, cuando haga falta regenerarlos:
 *
 *     node tools/generar-iconos-android.mjs
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { BLANCO, codificarPng, renderizarIcono } from "./lib/iconos.mjs";

const CARPETA_RES = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "android",
  "app",
  "src",
  "main",
  "res",
);

/**
 * Cuánto del lienzo ocupa el dibujo en el icono adaptable.
 *
 * El suelo técnico son los 66dp de zona segura de los 108dp del lienzo
 * (0,61): por debajo de eso, el recorte del lanzador no puede comerse nada.
 * Se queda en 0,50 por estética, no por seguridad —a ras de la zona segura el
 * despertador llegaba hasta el borde del círculo y se veía apretado—.
 */
const MARGEN_ADAPTABLE = 0.5;

/** Lo mismo para el icono clásico, al que no recorta nadie. */
const MARGEN_CLASICO = 0.74;

const DENSIDADES = [
  { carpeta: "mipmap-mdpi", clasico: 48, adaptable: 108 },
  { carpeta: "mipmap-hdpi", clasico: 72, adaptable: 162 },
  { carpeta: "mipmap-xhdpi", clasico: 96, adaptable: 216 },
  { carpeta: "mipmap-xxhdpi", clasico: 144, adaptable: 324 },
  { carpeta: "mipmap-xxxhdpi", clasico: 192, adaptable: 432 },
];

function escribirPng(ruta, tamano, opciones) {
  const rgba = renderizarIcono(tamano, opciones);
  const png = codificarPng(tamano, tamano, rgba);
  writeFileSync(ruta, png);
  console.log(`${ruta}  (${tamano}×${tamano}, ${png.length} bytes)`);
}

for (const { carpeta, clasico, adaptable } of DENSIDADES) {
  const destino = join(CARPETA_RES, carpeta);

  // Mismo dibujo para el clásico y el redondo: a estos tamaños, y con lo poco
  // frecuentes que son ya los lanzadores redondos de Android 7-7.1, no hace
  // falta una segunda variante recortada a círculo.
  const opcionesClasico = { fondo: BLANCO, radioRelativo: MARGEN_CLASICO };
  escribirPng(join(destino, "ic_launcher.png"), clasico, opcionesClasico);
  escribirPng(join(destino, "ic_launcher_round.png"), clasico, opcionesClasico);
  escribirPng(join(destino, "ic_launcher_foreground.png"), adaptable, {
    fondo: null,
    radioRelativo: MARGEN_ADAPTABLE,
  });
}
