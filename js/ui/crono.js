/**
 * RadioAlarm · Vista del cronómetro
 *
 * El cronómetro en sí (`js/motor/tiempo.js`) no sabe nada de DOM ni de
 * temporizadores reales: aquí es donde se conecta con un `setInterval` de
 * verdad y se pinta en pantalla.
 *
 * Solo hay un `setInterval` en marcha mientras el cronómetro está corriendo
 * —parado no hay nada que repintar—, y solo se toca el DOM si esta vista es
 * la que está abierta ahora mismo; si el cronómetro sigue corriendo mientras
 * el usuario está en otra pantalla, al volver se repinta con el tiempo real
 * transcurrido, no con el que tenía la última vez que se vio.
 */

import { crearCronometro, formatoCronometro } from "../motor/tiempo.js";
import { establecerNecesidad } from "../motor/vigilia.js";
import { vistaActual } from "./vistas.js";

/** Clave con la que este módulo pide la vigilia; ver `motor/vigilia.js`. */
const RAZON_VIGILIA = "crono";
/** Cada cuánto se repinta mientras corre. Con centésimas, hace falta ir fino. */
const INTERVALO_MS = 30;

const crono = crearCronometro();
let temporizador = null;

function pintar() {
  const valor = document.getElementById("crono-valor");
  if (valor) valor.textContent = formatoCronometro(crono.transcurridoMs());

  const corriendo = crono.estaCorriendo();

  const botonIniciar = document.getElementById("btn-crono-iniciar");
  if (botonIniciar) botonIniciar.textContent = corriendo ? "Pausar" : "Iniciar";

  // Reiniciar con el cronómetro en marcha perdería el tiempo sin querer: hay
  // que pausarlo primero.
  document.getElementById("btn-crono-reiniciar")?.toggleAttribute("disabled", corriendo);
}

function tick() {
  if (vistaActual() === "crono") pintar();
}

function iniciarTick() {
  temporizador ??= setInterval(tick, INTERVALO_MS);
}

function detenerTick() {
  clearInterval(temporizador);
  temporizador = null;
}

function iniciarOPausar() {
  if (crono.estaCorriendo()) {
    crono.pausar();
    detenerTick();
  } else {
    crono.iniciar();
    iniciarTick();
  }

  establecerNecesidad(RAZON_VIGILIA, crono.estaCorriendo());
  pintar();
}

function reiniciar() {
  if (crono.estaCorriendo()) return;

  crono.reiniciar();
  pintar();
}

export function iniciarCrono() {
  document.getElementById("btn-crono-iniciar")?.addEventListener("click", iniciarOPausar);
  document.getElementById("btn-crono-reiniciar")?.addEventListener("click", reiniciar);

  document.addEventListener("vista:cambiada", (evento) => {
    if (evento.detail.vista === "crono") pintar();
  });

  pintar();
}
