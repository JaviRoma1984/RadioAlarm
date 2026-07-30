/**
 * RadioAlarm · Vibración
 *
 * `navigator.vibrate(patrón)` solo reproduce el patrón una vez; para que siga
 * vibrando mientras algo suena —una alarma, una cuenta atrás que ha
 * terminado— hay que volver a pedirlo cada pocos segundos. Eso es lo único
 * que añade este módulo sobre la API: nada de estado propio más allá del
 * temporizador que repite la llamada.
 *
 * No existe en todos los dispositivos —los de escritorio, sobre todo—, así
 * que se comprueba antes de usarla y, si no está, simplemente no hace nada.
 */

const PATRON = [500, 300];
const REPETIR_CADA_MS = 2000;

let temporizador = null;

function disponible() {
  return "vibrate" in navigator;
}

/** Empieza a vibrar en el patrón de aviso, repitiéndolo hasta que se pare. */
export function iniciarVibracion() {
  if (!disponible()) return;

  navigator.vibrate(PATRON);
  temporizador = setInterval(() => navigator.vibrate(PATRON), REPETIR_CADA_MS);
}

export function detenerVibracion() {
  clearInterval(temporizador);
  temporizador = null;
  if (disponible()) navigator.vibrate(0);
}
