/**
 * RadioAlarm · Puente con la alarma nativa (envoltorio Android)
 *
 * Fuera del envoltorio nativo (`window.Capacitor` no existe) este módulo no
 * hace nada: en el navegador, el motor de disparo (motor/motor.js) ya se
 * basta con la pestaña abierta.
 *
 * El plugin nativo (AlarmSchedulerPlugin.kt/java) solo programa y despierta;
 * nunca decide qué alarma debe sonar ni cuándo —eso ya existe y está
 * probado en JS—. Este módulo recalcula con `proximoDisparo` (la misma
 * función que usa el motor en el navegador) cuándo debe sonar cada alarma
 * activa, y reprograma en AlarmManager solo lo que haya cambiado desde la
 * última vez. Cuando la app se abre porque una de esas alarmas nativas ha
 * saltado, avisa al motor para que muestre el aviso de sonando, con
 * `motor/motor.js`'s `activarAlarmaNativa`.
 */

import { proximoDisparo } from "./model/alarma.js";
import { alCambiar, listarAlarmas } from "./model/alarmas.js";
import { activarAlarmaNativa } from "./motor/motor.js";
import { leer, escribir } from "./store.js";

/** Ids que este módulo tenía programados en AlarmManager la última vez. */
const CLAVE_PROGRAMADAS = "nativo.programadas";

function obtenerPlugin() {
  return window.Capacitor?.Plugins?.AlarmScheduler ?? null;
}

/**
 * Recalcula qué alarmas nativas deberían estar programadas ahora mismo y
 * reprograma solo la diferencia con la última vez: se cancelan las que ya
 * no deben sonar (desactivadas, borradas, sin próximo disparo) y se
 * programan o actualizan las demás.
 */
function resincronizar() {
  const nativo = obtenerPlugin();
  if (!nativo) return;

  const ahora = new Date();
  const objetivo = new Map();

  for (const alarma of listarAlarmas()) {
    if (!alarma.activa) continue;

    const disparo = proximoDisparo(alarma, ahora);
    if (disparo) objetivo.set(alarma.id, disparo.getTime());
  }

  const previas = leer(CLAVE_PROGRAMADAS) ?? [];
  for (const id of previas) {
    if (!objetivo.has(id)) nativo.cancelar({ id }).catch(() => {});
  }

  for (const [id, cuando] of objetivo) {
    nativo.programar({ id, cuando }).catch(() => {});
  }

  escribir(CLAVE_PROGRAMADAS, [...objetivo.keys()]);
}

/** Si la app se ha abierto porque una alarma nativa ha saltado, la muestra. */
async function comprobarLanzamiento() {
  const nativo = obtenerPlugin();
  if (!nativo) return;

  try {
    const { idAlarma } = await nativo.comprobarLanzamiento();
    if (idAlarma) activarAlarmaNativa(idAlarma);
  } catch {
    /* Sin plugin nativo no hay nada que comprobar. */
  }
}

export function iniciarNativo() {
  const nativo = obtenerPlugin();
  if (!nativo) return;

  comprobarLanzamiento();
  resincronizar();

  // Cualquier alta, baja, edición o activar/desactivar pasa por aquí, sin
  // que este módulo necesite saber cuál de esas cosas fue.
  alCambiar(resincronizar);

  // La app ya estaba abierta y una alarma nativa la ha vuelto a traer al
  // frente: a diferencia de un arranque en frío, esto llega como evento, no
  // por `comprobarLanzamiento`.
  nativo.addListener("alarmaLanzada", ({ idAlarma }) => {
    if (idAlarma) activarAlarmaNativa(idAlarma);
  });
}
