/**
 * RadioAlarm · Registro del service worker
 *
 * El propio sw.js no se autoactiva cuando hay una versión nueva —se queda
 * esperando, para no interrumpir una alarma sonando o un cronómetro en
 * marcha—. Este módulo solo avisa de que existe esa versión nueva; se
 * aplicará sola la próxima vez que se abra la app.
 *
 * Dentro del envoltorio Android (Capacitor) no se registra: ahí todos los
 * archivos ya van empaquetados en el propio APK, así que el service worker
 * no aporta nada —y sí un problema real, porque su caché sobrevive a
 * actualizar el APK (instalar encima no borra los datos de la app), y
 * puede quedarse sirviendo CSS/JS de una versión anterior—.
 */

import { toast } from "./ui/toast.js";

/**
 * Limpia cualquier resto de una versión anterior de esta misma app que
 * hubiera llegado a registrar el service worker antes de este cambio —
 * instalar el APK encima no borra los datos de la app, así que sin esto se
 * seguiría sirviendo CSS/JS viejo desde esa caché aunque el código nuevo ya
 * no la registre—. Inofensivo si nunca hubo nada que limpiar.
 */
function limpiarServiceWorkerNativo() {
  navigator.serviceWorker
    .getRegistrations()
    .then((registros) => registros.forEach((registro) => registro.unregister()));

  if ("caches" in window) {
    caches.keys().then((nombres) => nombres.forEach((nombre) => caches.delete(nombre)));
  }
}

export function iniciarPwa() {
  if (!("serviceWorker" in navigator)) return;

  if (window.Capacitor) {
    limpiarServiceWorkerNativo();
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(new URL("../sw.js", import.meta.url))
      .then((registro) => {
        registro.addEventListener("updatefound", () => {
          const nuevo = registro.installing;
          if (!nuevo) return;

          nuevo.addEventListener("statechange", () => {
            // `controller` ya existía antes de este registro: es una
            // actualización, no la primera instalación.
            if (nuevo.state === "installed" && navigator.serviceWorker.controller) {
              toast("Hay una versión nueva. Se aplicará la próxima vez que abras la app.", {
                tipo: "info",
                duracion: 6000,
              });
            }
          });
        });
      })
      .catch(() => {
        /* Sin service worker la app sigue funcionando igual, solo que sin caché. */
      });
  });
}
