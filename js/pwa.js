/**
 * RadioAlarm · Registro del service worker
 *
 * El propio sw.js no se autoactiva cuando hay una versión nueva —se queda
 * esperando, para no interrumpir una alarma sonando o un cronómetro en
 * marcha—. Este módulo solo avisa de que existe esa versión nueva; se
 * aplicará sola la próxima vez que se abra la app.
 */

import { toast } from "./ui/toast.js";

export function iniciarPwa() {
  if (!("serviceWorker" in navigator)) return;

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
