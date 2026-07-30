/**
 * RadioAlarm · Almacén de audios propios
 *
 * Guarda los archivos de audio que el usuario elige como canción de alarma.
 * No puede vivir en `localStorage`: es texto plano con una cuota de unos
 * pocos MB, y una sola canción ya la agotaría. IndexedDB guarda `Blob`
 * binarios de forma nativa y con una cuota muchísimo mayor —cientos de MB o
 * más, según el navegador—, así que es el sitio correcto.
 *
 * Cada registro es `{ id, nombre, blob }`. El `id` es el que se guarda en el
 * campo `sonido.cancion.id` de la alarma; `nombre` es solo para mostrarlo.
 */

const NOMBRE_BD = "radioalarm";
const VERSION_BD = 1;
const ALMACEN = "audios";

/** Promesa de la conexión, reutilizada entre llamadas. */
let conexion = null;

function abrir() {
  conexion ??= new Promise((resuelve, rechaza) => {
    const peticion = indexedDB.open(NOMBRE_BD, VERSION_BD);

    peticion.onupgradeneeded = () => {
      peticion.result.createObjectStore(ALMACEN, { keyPath: "id" });
    };

    peticion.onsuccess = () => resuelve(peticion.result);
    peticion.onerror = () => rechaza(peticion.error);
  });

  return conexion;
}

/** Envuelve un `IDBRequest` en una promesa. */
function pedir(fabricaPeticion) {
  return new Promise((resuelve, rechaza) => {
    const peticion = fabricaPeticion();
    peticion.onsuccess = () => resuelve(peticion.result);
    peticion.onerror = () => rechaza(peticion.error);
  });
}

/**
 * Guarda un audio. Sobrescribe si el `id` ya existía.
 * @param {{id: string, nombre: string, blob: Blob}} audio
 */
export async function guardarAudio(audio) {
  const bd = await abrir();
  const almacen = bd.transaction(ALMACEN, "readwrite").objectStore(ALMACEN);
  await pedir(() => almacen.put(audio));
}

/** @returns {Promise<{id: string, nombre: string, blob: Blob}|null>} */
export async function obtenerAudio(id) {
  const bd = await abrir();
  const almacen = bd.transaction(ALMACEN, "readonly").objectStore(ALMACEN);
  const resultado = await pedir(() => almacen.get(id));
  return resultado ?? null;
}

export async function borrarAudio(id) {
  const bd = await abrir();
  const almacen = bd.transaction(ALMACEN, "readwrite").objectStore(ALMACEN);
  await pedir(() => almacen.delete(id));
}

/** Identificador nuevo para un audio guardado. */
export function nuevoIdAudio() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `audio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
