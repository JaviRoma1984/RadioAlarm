/**
 * RadioAlarm · Puente con la alarma nativa (envoltorio Android)
 *
 * Fuera del envoltorio nativo (`window.Capacitor` no existe) este módulo no
 * hace nada: en el navegador, el motor de disparo (motor/motor.js) ya se
 * basta con la pestaña abierta.
 *
 * El plugin nativo (AlarmSchedulerPlugin.kt/java) solo programa y despierta;
 * nunca decide qué alarma debe sonar ni cuándo —eso ya existe y está
 * probado en JS—. Este módulo recalcula con `proximoDisparo` (la misma
 * función que usa el motor en el navegador) cuándo debe sonar cada alarma
 * activa, y reprograma en AlarmManager solo lo que haya cambiado desde la
 * última vez. Cuando la app se abre porque una de esas alarmas nativas ha
 * saltado, avisa al motor para que muestre el aviso de sonando, con
 * `motor/motor.js`'s `activarAlarmaNativa`.
 */

import { FUENTE, proximoDisparo } from "./model/alarma.js";
import { alCambiar, listarAlarmas } from "./model/alarmas.js";
import { configuracionSonido } from "./model/configuracionSonido.js";
import { activarAlarmaNativa } from "./motor/motor.js";
import { obtenerAudio } from "./store/audioBlobs.js";
import { leer, escribir } from "./store.js";

/** Ids que este módulo tenía programados en AlarmManager la última vez. */
const CLAVE_PROGRAMADAS = "nativo.programadas";
/** Ids de canción ya copiados a almacenamiento nativo; ver `asegurarCancionExportada`. */
const CLAVE_AUDIOS_EXPORTADOS = "nativo.audios-exportados";

function obtenerPlugin() {
  return window.Capacitor?.Plugins?.AlarmScheduler ?? null;
}

/**
 * Convierte un Blob a base64 en trozos, para no reventar la pila de
 * `String.fromCharCode` con un archivo de varios megabytes de golpe.
 */
async function blobABase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const TAMANO_TROZO = 0x8000;
  let binario = "";

  for (let i = 0; i < bytes.length; i += TAMANO_TROZO) {
    binario += String.fromCharCode.apply(null, bytes.subarray(i, i + TAMANO_TROZO));
  }

  return btoa(binario);
}

/**
 * Copia el audio de una canción elegida como alarma a almacenamiento nativo,
 * una sola vez por id: el audio real vive en el IndexedDB de la propia
 * WebView (`store/audioBlobs.js`), al que `AlarmService` no tiene acceso
 * cuando la app está cerrada. Sin esta copia, una alarma de canción sonando
 * sin la app abierta no tendría ningún archivo que reproducir.
 */
async function asegurarCancionExportada(nativo, cancionId) {
  const exportados = new Set(leer(CLAVE_AUDIOS_EXPORTADOS) ?? []);
  if (exportados.has(cancionId)) return;

  const audio = await obtenerAudio(cancionId);
  if (!audio) return;

  try {
    const base64 = await blobABase64(audio.blob);
    await nativo.guardarAudioCancion({ id: cancionId, base64 });
    exportados.add(cancionId);
    escribir(CLAVE_AUDIOS_EXPORTADOS, [...exportados]);
  } catch {
    // No se marca como exportada: se reintentará en la próxima resincronización.
  }
}

/**
 * Recalcula qué alarmas nativas deberían estar programadas ahora mismo y
 * reprograma solo la diferencia con la última vez: se cancelan las que ya
 * no deben sonar (desactivadas, borradas, sin próximo disparo) y se
 * programan o actualizan las demás, con los datos de sonido que
 * `AlarmService` necesita para reproducir la alarma sin la app abierta.
 */
async function resincronizar() {
  const nativo = obtenerPlugin();
  if (!nativo) return;

  const ahora = new Date();
  const objetivo = new Map();

  for (const alarma of listarAlarmas()) {
    if (!alarma.activa) continue;

    const disparo = proximoDisparo(alarma, ahora);
    if (disparo) objetivo.set(alarma.id, { cuando: disparo.getTime(), sonido: alarma.sonido });
  }

  const previas = leer(CLAVE_PROGRAMADAS) ?? [];
  for (const id of previas) {
    if (!objetivo.has(id)) nativo.cancelar({ id }).catch(() => {});
  }

  const { ascendente } = configuracionSonido();

  for (const [id, { cuando, sonido }] of objetivo) {
    if (sonido.tipo === FUENTE.CANCION && sonido.cancion) {
      await asegurarCancionExportada(nativo, sonido.cancion.id);
    }

    nativo
      .programar({
        id,
        cuando,
        tipoSonido: sonido.tipo,
        tono: sonido.tono,
        cancionId: sonido.cancion?.id ?? null,
        emisoraUrl: sonido.emisora?.url ?? null,
        ascendente,
      })
      .catch(() => {});
  }

  escribir(CLAVE_PROGRAMADAS, [...objetivo.keys()]);
}

/** Si la app se ha abierto porque una alarma nativa ha saltado, la muestra. */
async function comprobarLanzamiento() {
  const nativo = obtenerPlugin();
  if (!nativo) return;

  try {
    const { idAlarma } = await nativo.comprobarLanzamiento();
    if (idAlarma) activarAlarmaNativa(idAlarma);
  } catch {
    /* Sin plugin nativo no hay nada que comprobar. */
  }
}

export function iniciarNativo() {
  const nativo = obtenerPlugin();
  if (!nativo) return;

  comprobarLanzamiento();
  resincronizar();

  // Cualquier alta, baja, edición o activar/desactivar pasa por aquí, sin
  // que este módulo necesite saber cuál de esas cosas fue.
  alCambiar(resincronizar);

  // La app ya estaba abierta y una alarma nativa la ha vuelto a traer al
  // frente: a diferencia de un arranque en frío, esto llega como evento, no
  // por `comprobarLanzamiento`.
  nativo.addListener("alarmaLanzada", ({ idAlarma }) => {
    if (idAlarma) activarAlarmaNativa(idAlarma);
  });
}
