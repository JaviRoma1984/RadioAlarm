/**
 * RadioAlarm · Reproductor de canción y emisora
 *
 * Un único elemento `<audio>` compartido para tres cosas: escuchar una
 * canción propia o probar una emisora antes de guardarla (vista previa,
 * suena una vez al volumen normal), y hacer sonar la alarma de verdad cuando
 * la fuente es una canción o una emisora (en bucle —o en directo, si es una
 * emisora— y con el volumen subiendo poco a poco).
 *
 * Es deliberadamente distinto del sintetizador de tonos
 * (`js/audio/sintetizador.js`), que genera ondas con Web Audio: aquí se
 * reproducen archivos y streams de verdad, para lo que basta —y es más
 * simple— un elemento `<audio>` normal.
 *
 * Solo hay un sonido a la vez en este elemento: empezar uno corta el anterior,
 * sea vista previa o alarma.
 */

/** Volumen de arranque al sonar una alarma: no asustar al despertar. */
const VOLUMEN_INICIAL_ALARMA = 0.08;
/** Cada cuánto se sube un escalón de volumen durante la rampa. */
const PASO_RAMPA_MS = 200;

let elemento = null;
/** URL de objeto de la canción actual, para liberarla al cambiar o parar. */
let urlObjeto = null;
let temporizadorRampa = null;
/** El manejador de error de la reproducción en curso, para poder quitarlo. */
let manejadorError = null;

function elementoAudio() {
  elemento ??= new Audio();
  return elemento;
}

function liberarUrlObjeto() {
  if (urlObjeto) {
    URL.revokeObjectURL(urlObjeto);
    urlObjeto = null;
  }
}

function pararRampa() {
  clearInterval(temporizadorRampa);
  temporizadorRampa = null;
}

function quitarManejadorError() {
  if (manejadorError) {
    elemento?.removeEventListener("error", manejadorError);
    manejadorError = null;
  }
}

/**
 * Sube el volumen del elemento de `VOLUMEN_INICIAL_ALARMA` a 1 en `rampaMs`
 * milisegundos. `<audio>` no tiene un equivalente a las rampas de Web Audio,
 * así que se hace a pasos con un intervalo.
 */
function iniciarRampa(audio, rampaMs) {
  pararRampa();

  const pasos = Math.max(1, Math.round(rampaMs / PASO_RAMPA_MS));
  const incremento = (1 - VOLUMEN_INICIAL_ALARMA) / pasos;
  let paso = 0;

  audio.volume = VOLUMEN_INICIAL_ALARMA;
  temporizadorRampa = setInterval(() => {
    paso += 1;
    audio.volume = Math.min(1, VOLUMEN_INICIAL_ALARMA + incremento * paso);
    if (paso >= pasos) pararRampa();
  }, PASO_RAMPA_MS);
}

/** Corta cualquier sonido en marcha —vista previa o alarma— en este elemento. */
export function pararVistaPrevia() {
  pararRampa();
  quitarManejadorError();
  if (!elemento) return;

  elemento.pause();
  elemento.loop = false;
  elemento.volume = 1;
  elemento.removeAttribute("src");
  elemento.load();
  liberarUrlObjeto();
}

/**
 * Reproduce un archivo de audio ya guardado, una vez y al volumen normal.
 * @param {Blob} blob
 * @returns {Promise<void>} Se resuelve en cuanto empieza a sonar.
 */
export async function reproducirBlob(blob) {
  pararVistaPrevia();

  const audio = elementoAudio();
  urlObjeto = URL.createObjectURL(blob);
  audio.src = urlObjeto;

  await audio.play();
}

/**
 * Prueba una emisora por su URL de stream, una vez y al volumen normal.
 * @param {string} url
 * @returns {Promise<void>} Se resuelve en cuanto empieza a sonar; si el stream
 *   no carga o el navegador no puede reproducirlo, la promesa se rechaza.
 */
export async function probarEmisora(url) {
  pararVistaPrevia();

  const audio = elementoAudio();
  audio.src = url;

  await audio.play();
}

/**
 * Hace sonar una canción guardada como alarma: en bucle y con el volumen
 * subiendo poco a poco. A diferencia de `reproducirBlob`, no se detiene sola.
 *
 * @param {Blob} blob
 * @param {{rampaMs?: number, onError?: () => void}} [opciones] `onError` avisa
 *   si la reproducción falla más adelante (archivo corrupto, por ejemplo), no
 *   solo si falla al arrancar —eso ya lo indica la promesa al rechazar—.
 * @returns {Promise<void>} Se resuelve en cuanto empieza a sonar.
 */
export async function sonarCancionEnBucle(blob, { rampaMs = 20000, onError } = {}) {
  pararVistaPrevia();

  const audio = elementoAudio();
  urlObjeto = URL.createObjectURL(blob);
  audio.src = urlObjeto;
  audio.loop = true;

  if (onError) {
    manejadorError = onError;
    audio.addEventListener("error", manejadorError, { once: true });
  }

  iniciarRampa(audio, rampaMs);
  await audio.play();
}

/**
 * Hace sonar una emisora como alarma: en directo —un stream no "acaba", así
 * que no hay bucle que activar— y con el volumen subiendo poco a poco.
 *
 * @param {string} url
 * @param {{rampaMs?: number, onError?: () => void}} [opciones]
 * @returns {Promise<void>} Se resuelve en cuanto empieza a sonar.
 */
export async function sonarEmisoraEnBucle(url, { rampaMs = 20000, onError } = {}) {
  pararVistaPrevia();

  const audio = elementoAudio();
  audio.loop = false;
  audio.src = url;

  if (onError) {
    manejadorError = onError;
    audio.addEventListener("error", manejadorError, { once: true });
  }

  iniciarRampa(audio, rampaMs);
  await audio.play();
}
