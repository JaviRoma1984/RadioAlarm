/**
 * RadioAlarm · Repositorio de alarmas
 *
 * Único punto por el que pasa la lectura y escritura de alarmas. Todo lo que
 * sale de aquí está ya saneado por `normalizarAlarma`, así que la interfaz
 * nunca tiene que desconfiar del dato.
 *
 * Los cambios se avisan con una lista de oyentes propia en lugar de eventos del
 * DOM: así el módulo no depende del navegador y se puede probar en Node.
 */

import { leer, escribir } from "../store.js";
import { REPETICION, normalizarAlarma, ordenarAlarmas, proximoDisparo } from "./alarma.js";

const CLAVE = "alarmas";

const oyentes = new Set();

/**
 * Se suscribe a los cambios en las alarmas.
 * @param {() => void} oyente
 * @returns {() => void} Función para darse de baja.
 */
export function alCambiar(oyente) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

function avisar() {
  oyentes.forEach((oyente) => oyente());
}

/**
 * Lee la lista completa saneada.
 *
 * Se descartan las alarmas con un `id` repetido: un duplicado haría que editar
 * o borrar una afectase a la otra.
 */
function cargar() {
  const bruto = leer(CLAVE, []);
  if (!Array.isArray(bruto)) return [];

  const vistos = new Set();
  const alarmas = [];

  for (const elemento of bruto) {
    const alarma = normalizarAlarma(elemento);
    if (vistos.has(alarma.id)) continue;
    vistos.add(alarma.id);
    alarmas.push(alarma);
  }

  return alarmas;
}

function persistir(alarmas) {
  const guardado = escribir(CLAVE, alarmas);
  if (guardado) avisar();
  return guardado;
}

/* -------------------------------------------------------------------------- */
/*  Consultas                                                                 */
/* -------------------------------------------------------------------------- */

/** Todas las alarmas, ordenadas por hora. */
export function listarAlarmas() {
  return ordenarAlarmas(cargar());
}

export function obtenerAlarma(id) {
  return cargar().find((alarma) => alarma.id === id) ?? null;
}

export function contarAlarmas() {
  return cargar().length;
}

/**
 * Alarma activa que sonará antes que ninguna otra.
 * @param {Date} [desde]
 * @returns {{alarma: object, cuando: Date}|null}
 */
export function proximaAlarma(desde = new Date()) {
  let mejor = null;

  for (const alarma of cargar()) {
    const cuando = proximoDisparo(alarma, desde);
    if (!cuando) continue;
    if (!mejor || cuando.getTime() < mejor.cuando.getTime()) mejor = { alarma, cuando };
  }

  return mejor;
}

/* -------------------------------------------------------------------------- */
/*  Modificaciones                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Crea o actualiza una alarma. Si el `id` ya existe se sustituye, conservando su
 * fecha de creación.
 *
 * @param {object} datos Alarma completa o parcial; se sanea antes de guardar.
 * @returns {object|null} La alarma guardada, o `null` si no se pudo persistir.
 */
export function guardarAlarma(datos) {
  const alarma = normalizarAlarma(datos);
  alarma.modificada = new Date().toISOString();

  const alarmas = cargar();
  const indice = alarmas.findIndex((otra) => otra.id === alarma.id);

  if (indice >= 0) {
    alarma.creada = alarmas[indice].creada;
    alarmas[indice] = alarma;
  } else {
    alarmas.push(alarma);
  }

  return persistir(alarmas) ? alarma : null;
}

/** @returns {boolean} `true` si existía y se ha borrado. */
export function borrarAlarma(id) {
  const alarmas = cargar();
  const restantes = alarmas.filter((alarma) => alarma.id !== id);

  if (restantes.length === alarmas.length) return false;

  return persistir(restantes);
}

/**
 * Activa o desactiva una alarma sin tocar el resto de sus datos.
 * @returns {object|null} La alarma resultante, o `null` si no existe.
 */
export function establecerActiva(id, activa) {
  const alarma = obtenerAlarma(id);
  if (!alarma) return null;

  return guardarAlarma({ ...alarma, activa: Boolean(activa) });
}

/** Invierte el estado de activación. */
export function alternarActiva(id) {
  const alarma = obtenerAlarma(id);
  if (!alarma) return null;

  return establecerActiva(id, !alarma.activa);
}

/**
 * El motor de disparo llama a esto en cuanto una alarma empieza a sonar, antes
 * de que nadie la posponga o la descarte.
 *
 * Una alarma de «una vez» ya ha cumplido su propósito con ese disparo: se
 * desactiva para no volver a sonar sola dentro de 24 h. Una personalizada no
 * cambia —el próximo día marcado ya sale solo de `proximoDisparo`—.
 *
 * Posponer no pasa por aquí: el reintento vive en memoria, en el propio motor,
 * y no depende de este campo.
 *
 * @returns {object|null} La alarma resultante, o `null` si no existe.
 */
export function marcarComoSonada(id) {
  const alarma = obtenerAlarma(id);
  if (!alarma) return null;

  if (alarma.repeticion !== REPETICION.UNA_VEZ) return alarma;

  return establecerActiva(id, false);
}

/** Borra todas las alarmas. Pensado para el mantenimiento, no para la interfaz. */
export function borrarTodas() {
  return persistir([]);
}
