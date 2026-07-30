/**
 * RadioAlarm · Vigilia (Wake Lock)
 *
 * Envuelve la Wake Lock API para mantener la pantalla encendida mientras haya
 * una alarma por sonar. Sin esto, el móvil apaga la pantalla y el navegador
 * puede llegar a suspender la pestaña, con lo que la alarma no sonaría a su
 * hora —o no sonaría en absoluto—.
 *
 * No es una garantía: no todos los navegadores la implementan (Safari de
 * escritorio y Firefox, entre los que nos importan, no la tienen), y el
 * propio sistema operativo puede denegarla en algunas circunstancias (batería
 * muy baja, por ejemplo). Por eso el resto del motor no depende de que esta
 * vigilia esté realmente activa para funcionar: es una ayuda, no la base.
 *
 * El bloqueo se libera solo en cuanto la pestaña deja de estar visible —lo
 * exige la propia API—, así que aquí se vuelve a pedir en cuanto la pestaña
 * recupera la visibilidad, mientras siga haciendo falta.
 */

let bloqueo = null;
let haceFalta = false;

function disponible() {
  return "wakeLock" in navigator;
}

async function solicitar() {
  if (!disponible() || bloqueo || document.visibilityState !== "visible") return;

  try {
    bloqueo = await navigator.wakeLock.request("screen");
    bloqueo.addEventListener("release", () => {
      bloqueo = null;
    });
  } catch {
    // Denegado por el sistema, o la pestaña dejó de estar visible mientras se
    // pedía: no hay nada que hacer salvo intentarlo la próxima vez que toque.
    bloqueo = null;
  }
}

function liberar() {
  bloqueo?.release().catch(() => {});
  bloqueo = null;
}

/**
 * Indica si hace falta mantener la pantalla encendida. La llama el motor cada
 * vez que cambia si hay o no una próxima alarma activa.
 * @param {boolean} valor
 */
export function establecerNecesidad(valor) {
  haceFalta = valor;

  if (haceFalta) solicitar();
  else liberar();
}

/** Se llama una vez al arrancar, para recuperar la vigilia tras cada cambio de pestaña. */
export function iniciarVigilia() {
  document.addEventListener("visibilitychange", () => {
    if (haceFalta && document.visibilityState === "visible") solicitar();
  });
}
