/**
 * RadioAlarm · Configuración global de sonido
 *
 * Lógica pura de lectura y valores por defecto, sin nada de interfaz: la usan
 * tanto la vista de Opciones de sonido (para editarla) como el motor de
 * disparo y el puente nativo (para saber cómo debe sonar la alarma), y
 * ninguno de esos tres debe depender de los otros dos.
 */

import { TONO_POR_DEFECTO, existeTono } from "../datos/tonos.js";
import { leer, escribir } from "../store.js";

const CLAVE = "sonido";

export const POR_DEFECTO_SONIDO = {
  tono: TONO_POR_DEFECTO,
  cancion: null, // { nombre, id }
  emisora: null, // { nombre, url }
  /** `false`: suena a todo volumen desde el principio, sin subida progresiva. */
  ascendente: true,
};

/** Configuración de sonido guardada, completada con los valores por defecto. */
export function configuracionSonido() {
  const configuracion = { ...POR_DEFECTO_SONIDO, ...(leer(CLAVE) ?? {}) };

  // Siempre tiene que haber un tono válido seleccionado. Si lo guardado apunta
  // a un tono que ya no existe (catálogo cambiado, dato manipulado), se vuelve
  // al de fábrica en lugar de quedarse sin ninguno marcado.
  if (!existeTono(configuracion.tono)) {
    configuracion.tono = TONO_POR_DEFECTO;
  }

  return configuracion;
}

/** @returns {boolean} `true` si se guardó. */
export function guardarConfiguracionSonido(configuracion) {
  return escribir(CLAVE, configuracion);
}
