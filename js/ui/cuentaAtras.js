/**
 * RadioAlarm · Vista de la cuenta atrás
 *
 * Dos estados posibles en pantalla: el panel para fijar la duración de
 * partida (horas, minutos, segundos con los mismos contadores +/- del
 * pospuesto de una alarma), y el reloj grande contando hacia abajo. Se pasa
 * del uno al otro en cuanto se pulsa Iniciar, y se vuelve al panel al
 * reiniciar.
 *
 * Al llegar a cero suena y vibra igual que una alarma —reutiliza
 * `sintetizador.js` y `vibracion.js`—, pero con su propio aviso a pantalla
 * completa: un temporizador no tiene "posponer" ni "se ha perdido", así que
 * no tiene sentido la misma pantalla que la de una alarma.
 *
 * Igual que en el cronómetro, la cuenta sigue corriendo si se navega a otra
 * vista: el intervalo que la hace avanzar no depende de qué pantalla esté
 * abierta, solo el repintado sí.
 */

import { pararAlarmaTono, sonarAlarmaTono } from "../audio/sintetizador.js";
import { crearCuentaAtras, formatoReloj } from "../motor/tiempo.js";
import { detenerVibracion, iniciarVibracion } from "../motor/vibracion.js";
import { establecerNecesidad } from "../motor/vigilia.js";
import { configuracionSonido } from "./sonido.js";
import { vistaActual } from "./vistas.js";

/** Clave con la que este módulo pide la vigilia; ver `motor/vigilia.js`. */
const RAZON_VIGILIA = "cuenta-atras";
/** No hace falta tanta finura como el cronómetro: aquí se cuenta en segundos. */
const INTERVALO_MS = 250;
/** Más corta que la rampa de una alarma: aquí el usuario ya está pendiente. */
const RAMPA_MS = 8000;

const LIMITES = {
  horas: [0, 23],
  minutos: [0, 59],
  segundos: [0, 59],
};

const cuenta = crearCuentaAtras();
/** Duración que se está preparando, mientras no se pulse Iniciar. */
const ajuste = { horas: 0, minutos: 5, segundos: 0 };

let temporizador = null;
let elementoConFocoPrevio = null;

/* -------------------------------------------------------------------------- */
/*  Utilidades                                                                */
/* -------------------------------------------------------------------------- */

function duracionAjusteMs() {
  return ((ajuste.horas * 60 + ajuste.minutos) * 60 + ajuste.segundos) * 1000;
}

/** Nada consumido todavía: recién abierta, o recién reiniciada. */
function enAjuste() {
  return !cuenta.estaCorriendo() && cuenta.tiempoRestanteMs() === cuenta.duracion();
}

/* -------------------------------------------------------------------------- */
/*  Pintado                                                                   */
/* -------------------------------------------------------------------------- */

function pintar() {
  const ajustando = enAjuste();

  document.getElementById("cuenta-atras-ajuste")?.toggleAttribute("hidden", !ajustando);
  document.getElementById("cuenta-atras-horas-valor").textContent = String(ajuste.horas);
  document.getElementById("cuenta-atras-minutos-valor").textContent = String(ajuste.minutos);
  document.getElementById("cuenta-atras-segundos-valor").textContent = String(ajuste.segundos);

  const valor = document.getElementById("cuenta-atras-valor");
  if (valor) {
    valor.textContent = ajustando
      ? formatoReloj(duracionAjusteMs())
      : formatoReloj(cuenta.tiempoRestanteMs());
  }

  const corriendo = cuenta.estaCorriendo();
  const botonIniciar = document.getElementById("btn-cuenta-atras-iniciar");
  if (botonIniciar) {
    botonIniciar.textContent = corriendo ? "Pausar" : "Iniciar";
    botonIniciar.toggleAttribute("disabled", ajustando && duracionAjusteMs() <= 0);
  }
}

/* -------------------------------------------------------------------------- */
/*  Aviso de fin                                                              */
/* -------------------------------------------------------------------------- */

function mostrarAvisoFin() {
  const overlay = document.getElementById("temporizador-terminado");
  if (!overlay) return;

  elementoConFocoPrevio = document.activeElement;
  overlay.hidden = false;
  document.getElementById("btn-detener-temporizador")?.focus();
}

function ocultarAvisoFin() {
  const overlay = document.getElementById("temporizador-terminado");
  if (overlay) overlay.hidden = true;

  if (elementoConFocoPrevio?.isConnected) elementoConFocoPrevio.focus();
  elementoConFocoPrevio = null;
}

/* -------------------------------------------------------------------------- */
/*  Ciclo de vida                                                             */
/* -------------------------------------------------------------------------- */

function iniciarTick() {
  temporizador ??= setInterval(tick, INTERVALO_MS);
}

function detenerTick() {
  clearInterval(temporizador);
  temporizador = null;
}

function tick() {
  const terminado = cuenta.comprobar();

  if (vistaActual() === "cuenta-atras") pintar();
  if (terminado) finalizar();
}

function finalizar() {
  detenerTick();
  establecerNecesidad(RAZON_VIGILIA, false);

  mostrarAvisoFin();
  iniciarVibracion();
  sonarAlarmaTono(configuracionSonido().tono, { rampaMs: RAMPA_MS });
}

function detenerAviso() {
  detenerVibracion();
  pararAlarmaTono();
  ocultarAvisoFin();

  // Deja la cuenta atrás lista para volver a arrancar con el mismo ajuste.
  cuenta.reiniciar();
  pintar();
}

/* -------------------------------------------------------------------------- */
/*  Acciones                                                                  */
/* -------------------------------------------------------------------------- */

function ajustar(campo, delta) {
  if (!enAjuste()) return; // los contadores están ocultos, pero por si acaso

  const [minimo, maximo] = LIMITES[campo];
  ajuste[campo] = Math.min(maximo, Math.max(minimo, ajuste[campo] + delta));
  pintar();
}

function iniciarOPausar() {
  if (cuenta.estaCorriendo()) {
    cuenta.pausar();
    detenerTick();
  } else {
    if (enAjuste()) {
      const ms = duracionAjusteMs();
      if (ms <= 0) return;
      cuenta.establecerDuracion(ms);
    }
    cuenta.iniciar();
    iniciarTick();
  }

  establecerNecesidad(RAZON_VIGILIA, cuenta.estaCorriendo());
  pintar();
}

/** Actúa como "cancelar": disponible tanto corriendo como en pausa. */
function reiniciar() {
  detenerTick();
  cuenta.reiniciar();
  establecerNecesidad(RAZON_VIGILIA, false);
  pintar();
}

/* -------------------------------------------------------------------------- */
/*  Arranque                                                                  */
/* -------------------------------------------------------------------------- */

export function iniciarCuentaAtras() {
  document.getElementById("btn-cuenta-atras-iniciar")?.addEventListener("click", iniciarOPausar);
  document.getElementById("btn-cuenta-atras-reiniciar")?.addEventListener("click", reiniciar);
  document.getElementById("btn-detener-temporizador")?.addEventListener("click", detenerAviso);

  for (const campo of Object.keys(LIMITES)) {
    document
      .getElementById(`cuenta-atras-${campo}-menos`)
      ?.addEventListener("click", () => ajustar(campo, -1));
    document
      .getElementById(`cuenta-atras-${campo}-mas`)
      ?.addEventListener("click", () => ajustar(campo, 1));
  }

  document.addEventListener("vista:cambiada", (evento) => {
    if (evento.detail.vista === "cuenta-atras") pintar();
  });

  pintar();
}
