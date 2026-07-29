/**
 * RadioAlarm · Almacenamiento
 *
 * Capa mínima sobre localStorage: prefija las claves y serializa a JSON, de
 * modo que el resto de la app guarda y lee objetos sin preocuparse del formato.
 * Si el navegador tiene el almacenamiento bloqueado (modo privado restrictivo),
 * las funciones no fallan: simplemente no persiste nada.
 *
 * La Fase 2 construirá sobre este módulo el modelo de alarmas.
 */

const PREFIJO = "radioalarm.";

/**
 * @param {string} clave Sin prefijo, p. ej. `"sonido"`.
 * @param {any} porDefecto Valor devuelto si no hay nada guardado o está corrupto.
 */
export function leer(clave, porDefecto = null) {
  try {
    const bruto = localStorage.getItem(PREFIJO + clave);
    return bruto === null ? porDefecto : JSON.parse(bruto);
  } catch {
    // Dato ilegible o almacenamiento bloqueado: se cae al valor por defecto.
    return porDefecto;
  }
}

/** @returns {boolean} `true` si se pudo guardar. */
export function escribir(clave, valor) {
  try {
    localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

export function borrar(clave) {
  try {
    localStorage.removeItem(PREFIJO + clave);
  } catch {
    /* Nada que hacer. */
  }
}
