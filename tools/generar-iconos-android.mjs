/**
 * RadioAlarm · Iconos del envoltorio Android
 *
 * `npx cap add android` deja unos iconos genéricos de Capacitor en las
 * carpetas `mipmap-...` (`ic_launcher.png` y compañía): este script los
 * sustituye por el mismo dibujo de marca que ya usan la PWA y la cabecera
 * de la app —ver
 * `tools/lib/iconos.mjs`, compartido con `generar-iconos.mjs`—.
 *
 * Android usa dos formatos a la vez:
 *   - Icono clásico (`ic_launcher`/`ic_launcher_round`): el dibujo completo,
 *     con asas, a un tamaño por densidad (48/72/96/144/192 px).
 *   - Icono adaptable (API 26+, `ic_launcher_foreground` + el fondo turquesa
 *     de `drawable/ic_launcher_background.xml`): solo la esfera y la aguja,
 *     sin asas —el sistema puede recortar cualquier cosa fuera de la "zona
 *     segura" central—, encogido al 85 % del lienzo (108/162/216/324/432 px)
 *     para quedar con margen de sobra dentro de esa zona.
 *
 * Se ejecuta una vez, a mano, cuando haga falta regenerarlos:
 *
 *     node tools/generar-iconos-android.mjs
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { codificarPng, renderizarIcono } from "./lib/iconos.mjs";

const CARPETA_RES = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "android",
  "app",
  "src",
  "main",
  "res",
);

/** Encoge el dibujo dentro del lienzo del icono adaptable, ver cabecera. */
const MARGEN_ADAPTABLE = 0.85;

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

  // Mismo dibujo completo (con asas) para el clásico y el redondo: a estos
  // tamaños, y con lo poco frecuentes que son ya los lanzadores redondos de
  // Android 7-7.1, no hace falta una segunda variante recortada a círculo.
  escribirPng(join(destino, "ic_launcher.png"), clasico, { maskable: false });
  escribirPng(join(destino, "ic_launcher_round.png"), clasico, { maskable: false });
  escribirPng(join(destino, "ic_launcher_foreground.png"), adaptable, {
    maskable: true,
    radioRelativo: MARGEN_ADAPTABLE,
  });
}
