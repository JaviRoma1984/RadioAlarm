/**
 * RadioAlarm · Service worker
 *
 * Cachea la "app shell" para que la aplicación abra sin conexión. Estrategia:
 *
 *  - Peticiones de navegación (abrir/recargar la página): red primero, y si
 *    no hay red se sirve el index.html cacheado. Así, con conexión, siempre
 *    se ve la versión más reciente.
 *  - El resto de peticiones del mismo origen (CSS, JS, iconos): caché
 *    primero, y lo que no esté ya cacheado se pide a la red y se guarda para
 *    la próxima vez.
 *  - Peticiones a otros orígenes (las emisoras de radio) no se tocan: pasan
 *    directas a la red, tal cual. No tendría sentido cachear un directo.
 *
 * Importante: esta app puede tener una alarma sonando o un cronómetro en
 * marcha en la pestaña abierta, así que el service worker nuevo NO se activa
 * solo (nada de `skipWaiting`): se queda esperando a que el usuario cierre y
 * vuelva a abrir la app, para no interrumpir nada a media ejecución. El aviso
 * de que hay una versión nueva lo da js/pwa.js.
 */

const VERSION = "v1";
const CACHE = `radioalarm-${VERSION}`;

const ARCHIVOS_APP_SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/tokens.css",
  "css/base.css",
  "css/components.css",
  "icons/favicon-16.png",
  "icons/favicon-32.png",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-512-maskable.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ARCHIVOS_APP_SHELL)),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(nombres.filter((nombre) => nombre !== CACHE).map((nombre) => caches.delete(nombre))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const peticion = evento.request;
  if (peticion.method !== "GET") return;

  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;

  if (peticion.mode === "navigate") {
    evento.respondWith(
      fetch(peticion).catch(() => caches.match("index.html")),
    );
    return;
  }

  evento.respondWith(
    caches.match(peticion).then((enCache) => {
      if (enCache) return enCache;

      return fetch(peticion).then((respuesta) => {
        if (respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put(peticion, copia));
        }
        return respuesta;
      });
    }),
  );
});
