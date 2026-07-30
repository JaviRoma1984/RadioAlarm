/**
 * RadioAlarm · Motor de disparo
 *
 * El corazón de la aplicación: comprueba con regularidad si alguna alarma
 * debe sonar, y si es así, la hace sonar de verdad —sonido, vibración,
 * pantalla de alarma— hasta que se posponga o se descarte.
 *
 * La comprobación es por ventanas de tiempo, no por el instante exacto: cada
 * intervalo se fija en qué ha pasado desde la última comprobación hasta ahora
 * (`alarmasQueDebenSonar`, en `model/alarma.js`), no solo en si "ahora mismo"
 * coincide con una hora en punto. Así, si la pestaña ha estado en segundo
 * plano o el equipo suspendido, la alarma se detecta en cuanto se vuelve a
 * comprobar, en vez de perderse sin más.
 *
 * El pospuesto vive aquí, en memoria: no se guarda en el almacenamiento
 * porque es un reintento de esta sesión, no un dato permanente de la alarma.
 * Si la página se recarga a media espera de un pospuesto, ese pospuesto en
 * concreto se pierde —la alarma seguirá sonando en su siguiente ocasión
 * normal, simplemente sin esa repetición pendiente—.
 *
 * Solo suena una alarma a la vez: si varias coinciden, se ponen en cola y se
 * atienden una detrás de otra.
 */

import { FUENTE, REPETICION, alarmasQueDebenSonar } from "../model/alarma.js";
import { alCambiar, listarAlarmas, marcarComoSonada, obtenerAlarma, proximaAlarma } from "../model/alarmas.js";
import { obtenerAudio } from "../store/audioBlobs.js";
import { pararAlarmaTono, sonarAlarmaTono } from "../audio/sintetizador.js";
import { pararVistaPrevia, sonarCancionEnBucle, sonarEmisoraEnBucle } from "../audio/reproductor.js";
import { detenerVibracion, iniciarVibracion } from "./vibracion.js";
import { establecerNecesidad } from "./vigilia.js";

/** Clave con la que este módulo pide la vigilia; ver `vigilia.js`. */
const RAZON_VIGILIA = "alarmas";

/** Cada cuánto se comprueba si alguna alarma debe sonar. */
const INTERVALO_TICK_MS = 1000;
/** A partir de cuánto retraso se avisa de que la alarma se ha "perdido". */
const UMBRAL_PERDIDA_MS = 2 * 60 * 1000;
/** Cuánto tarda el sonido en llegar al volumen normal. */
const RAMPA_MS = 20000;

/** Última vez que se comprobó qué alarmas debían sonar. */
let ultimaComprobacion = new Date();

/** Pospuestos en curso: id de alarma → cuándo volver a sonar y cuántas veces ya. */
const pospuestas = new Map();

/** Alarmas detectadas a la espera de sonar, si ya hay una sonando. */
const cola = [];

/** La que está sonando ahora mismo, o `null`. */
let actual = null;

let temporizadorReloj = null;
let elementoConFocoPrevio = null;

/* -------------------------------------------------------------------------- */
/*  Sonido                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Arranca el sonido de la alarma según su fuente configurada, con
 * respaldo automático al tono si la canción ya no está disponible o la
 * emisora falla —al arrancar o más adelante, mientras suena—.
 */
async function iniciarSonido(alarma) {
  const { tipo, tono, cancion, emisora } = alarma.sonido;

  const usarTono = () => {
    pararVistaPrevia();
    sonarAlarmaTono(tono, { rampaMs: RAMPA_MS });
  };

  if (tipo === FUENTE.CANCION && cancion) {
    const audio = await obtenerAudio(cancion.id);
    if (audio) {
      try {
        await sonarCancionEnBucle(audio.blob, { rampaMs: RAMPA_MS, onError: usarTono });
        return;
      } catch {
        // El archivo ya no se puede reproducir (dato corrupto, formato no
        // soportado…): se cae al tono, igual que si no existiera.
      }
    }
    usarTono();
    return;
  }

  if (tipo === FUENTE.RADIO && emisora) {
    try {
      await sonarEmisoraEnBucle(emisora.url, { rampaMs: RAMPA_MS, onError: usarTono });
      return;
    } catch {
      usarTono();
      return;
    }
  }

  usarTono();
}

function detenerSonido() {
  pararAlarmaTono();
  pararVistaPrevia();
}

/* -------------------------------------------------------------------------- */
/*  Pantalla de alarma sonando                                                */
/* -------------------------------------------------------------------------- */

function formatoHora(fecha) {
  return `${String(fecha.getHours()).padStart(2, "0")}:${String(fecha.getMinutes()).padStart(2, "0")}`;
}

function iniciarRelojEnPantalla() {
  const nodo = document.getElementById("alarma-sonando-reloj");
  if (!nodo) return;

  const actualizar = () => {
    nodo.textContent = formatoHora(new Date());
  };

  actualizar();
  temporizadorReloj = setInterval(actualizar, 1000);
}

function detenerRelojEnPantalla() {
  clearInterval(temporizadorReloj);
  temporizadorReloj = null;
}

function mostrarOverlay({ alarma, perdida, vecesPospuesta }) {
  const overlay = document.getElementById("alarma-sonando");
  if (!overlay) return;

  const nombre = document.getElementById("alarma-sonando-nombre");
  if (nombre) nombre.textContent = alarma.nombre;

  const meta = document.getElementById("alarma-sonando-meta");
  if (meta) {
    meta.hidden = !perdida;
    meta.textContent = perdida ? `Tenía que sonar a las ${alarma.hora}` : "";
  }

  const puedePosponer = alarma.posponer.veces > 0 && vecesPospuesta < alarma.posponer.veces;
  const btnPosponer = document.getElementById("btn-posponer-alarma");
  if (btnPosponer) {
    btnPosponer.hidden = !puedePosponer;
    if (puedePosponer) btnPosponer.textContent = `Posponer ${alarma.posponer.minutos} min`;
  }

  elementoConFocoPrevio = document.activeElement;
  overlay.hidden = false;
  document.getElementById("btn-descartar-alarma")?.focus();
}

function ocultarOverlay() {
  const overlay = document.getElementById("alarma-sonando");
  if (overlay) overlay.hidden = true;

  // Devuelve el foco a donde estaba, si ese elemento sigue en la página.
  if (elementoConFocoPrevio?.isConnected) elementoConFocoPrevio.focus();
  elementoConFocoPrevio = null;
}

/* -------------------------------------------------------------------------- */
/*  Ciclo de vida de una alarma sonando                                       */
/* -------------------------------------------------------------------------- */

function yaEnJuego(id) {
  return actual?.alarma.id === id || cola.some((entrada) => entrada.alarma.id === id);
}

/**
 * Añade una alarma a la cola, si no está ya sonando o esperando turno.
 * @param {object} alarma
 * @param {Date} cuando Instante en que debería haber sonado.
 * @param {{esPospuesta?: boolean, vecesPospuesta?: number}} [extra]
 */
function encolar(alarma, cuando, extra = {}) {
  if (yaEnJuego(alarma.id)) return;

  // Una alarma de una vez ya ha cumplido su propósito con este disparo, tanto
  // si es el primero como si es un pospuesto: se desactiva de inmediato, no
  // solo si se llega a descartar.
  if (alarma.repeticion === REPETICION.UNA_VEZ) marcarComoSonada(alarma.id);

  const perdida = Date.now() - cuando.getTime() > UMBRAL_PERDIDA_MS;
  cola.push({ alarma, cuando, perdida, vecesPospuesta: extra.vecesPospuesta ?? 0 });

  avanzarCola();
}

function avanzarCola() {
  if (actual || cola.length === 0) return;

  actual = cola.shift();
  mostrarOverlay(actual);
  iniciarRelojEnPantalla();
  if (actual.alarma.vibracion) iniciarVibracion();
  iniciarSonido(actual.alarma);
}

function terminarDeSonar() {
  detenerVibracion();
  detenerRelojEnPantalla();
  detenerSonido();
  ocultarOverlay();
  actual = null;
  avanzarCola();
}

function posponer() {
  if (!actual) return;

  const { alarma, vecesPospuesta } = actual;
  pospuestas.set(alarma.id, {
    veces: vecesPospuesta + 1,
    siguiente: new Date(Date.now() + alarma.posponer.minutos * 60_000),
  });

  terminarDeSonar();
}

function descartar() {
  if (!actual) return;

  terminarDeSonar();
}

/* -------------------------------------------------------------------------- */
/*  Comprobación periódica                                                    */
/* -------------------------------------------------------------------------- */

function tick() {
  const ahora = new Date();

  for (const { alarma, cuando } of alarmasQueDebenSonar(listarAlarmas(), ultimaComprobacion, ahora)) {
    encolar(alarma, cuando);
  }

  for (const [id, info] of pospuestas) {
    if (info.siguiente.getTime() > ahora.getTime()) continue;

    pospuestas.delete(id);
    const alarma = obtenerAlarma(id);
    if (alarma) encolar(alarma, info.siguiente, { esPospuesta: true, vecesPospuesta: info.veces });
  }

  ultimaComprobacion = ahora;
}

/* -------------------------------------------------------------------------- */
/*  Arranque                                                                  */
/* -------------------------------------------------------------------------- */

export function iniciarMotor() {
  document.getElementById("btn-posponer-alarma")?.addEventListener("click", posponer);
  document.getElementById("btn-descartar-alarma")?.addEventListener("click", descartar);

  const actualizarVigilia = () => establecerNecesidad(RAZON_VIGILIA, Boolean(proximaAlarma()));
  actualizarVigilia();
  alCambiar(actualizarVigilia);

  setInterval(tick, INTERVALO_TICK_MS);

  // Si la pestaña vuelve de estar oculta un buen rato, comprueba enseguida en
  // vez de esperar al siguiente tick.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") tick();
  });
}
