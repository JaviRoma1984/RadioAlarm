/**
 * RadioAlarm · Vigilia (Wake Lock)
 *
 * Envuelve la Wake Lock API para mantener la pantalla encendida mientras haya
 * algo que lo necesite: una alarma por sonar, un cronómetro corriendo, una
 * cuenta atrás en marcha… Sin esto, el móvil apaga la pantalla y el navegador
 * puede llegar a suspender la pestaña, con lo que ese algo no llegaría a su
 * hora —o no llegaría en absoluto—.
 *
 * Puede haber varias razones a la vez para necesitarla —una alarma próxima Y
 * una cuenta atrás en marcha, por ejemplo—, así que se lleva un conjunto de
 * razones en vez de un único booleano: la vigilia solo se libera cuando ya no
 * queda ninguna, no en cuanto una de ellas deja de necesitarla.
 *
 * No es una garantía: no todos los navegadores la implementan (Safari de
 * escritorio y Firefox, entre los que nos importan, no la tienen), y el
 * propio sistema operativo puede denegarla en algunas circunstancias (batería
 * muy baja, por ejemplo). Por eso nada de lo que la pide depende de que esta
 * vigilia esté realmente activa para funcionar: es una ayuda, no la base.
 *
 * El bloqueo se libera solo en cuanto la pestaña deja de estar visible —lo
 * exige la propia API—, así que aquí se vuelve a pedir en cuanto la pestaña
 * recupera la visibilidad, mientras siga haciendo falta.
 */

let bloqueo = null;

/** Claves de quien la necesita ahora mismo: `"alarmas"`, `"crono"`, `"cuenta-atras"`… */
const razones = new Set();

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
 * Añade o quita una razón para mantener la pantalla encendida. Solo se libera
 * la vigilia cuando no queda ninguna razón activa.
 * @param {string} clave Identifica a quien la pide, para no pisar a otro.
 * @param {boolean} valor
 */
export function establecerNecesidad(clave, valor) {
  if (valor) razones.add(clave);
  else razones.delete(clave);

  if (razones.size > 0) solicitar();
  else liberar();
}

/** Se llama una vez al arrancar, para recuperar la vigilia tras cada cambio de pestaña. */
export function iniciarVigilia() {
  document.addEventListener("visibilitychange", () => {
    if (razones.size > 0 && document.visibilityState === "visible") solicitar();
  });
}
