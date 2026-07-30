/**
 * RadioAlarm · Reproductor de vista previa
 *
 * Un único elemento `<audio>` compartido para escuchar una canción propia o
 * probar una emisora de radio antes de guardarla. Es deliberadamente distinto
 * del sintetizador de tonos (`js/audio/sintetizador.js`), que genera ondas con
 * Web Audio: aquí se reproducen archivos y streams de verdad, para lo que
 * basta —y es más simple— un elemento `<audio>` normal.
 *
 * Solo hay una vista previa sonando a la vez: empezar una corta la anterior.
 */

let elemento = null;
/** URL de objeto de la canción actual, para liberarla al cambiar o parar. */
let urlObjeto = null;

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

/** Corta cualquier vista previa en marcha. */
export function pararVistaPrevia() {
  if (!elemento) return;

  elemento.pause();
  elemento.removeAttribute("src");
  elemento.load();
  liberarUrlObjeto();
}

/**
 * Reproduce un archivo de audio ya guardado.
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
 * Prueba una emisora por su URL de stream.
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
