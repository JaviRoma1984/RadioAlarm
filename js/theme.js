/**
 * RadioAlarm · Tema día / noche
 *
 * El tema se guarda en localStorage. Mientras el usuario no elija uno de forma
 * explícita, la app sigue la preferencia del sistema operativo y reacciona a
 * sus cambios en caliente.
 *
 * Nota: `index.html` ya aplica el tema en un script en línea antes del primer
 * pintado. Este módulo se encarga del conmutador y de mantenerlo sincronizado.
 */

const CLAVE = "radioalarm.tema";

/** Color de la barra de estado del navegador/móvil para cada tema. */
const COLOR_BARRA = {
  light: "#f4f7f6",
  dark: "#0b1210",
};

const consultaSistema = window.matchMedia("(prefers-color-scheme: dark)");

/** Lee la elección explícita del usuario, o `null` si no ha elegido. */
function temaGuardado() {
  try {
    const valor = localStorage.getItem(CLAVE);
    return valor === "light" || valor === "dark" ? valor : null;
  } catch {
    return null;
  }
}

/** Tema que está aplicado ahora mismo en el documento. */
export function temaActual() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/**
 * Aplica un tema al documento.
 * @param {"light"|"dark"} tema
 * @param {{recordar?: boolean}} opciones `recordar: false` para seguir al sistema.
 */
export function aplicarTema(tema, { recordar = true } = {}) {
  document.documentElement.dataset.theme = tema;

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", COLOR_BARRA[tema]);

  if (recordar) {
    try {
      localStorage.setItem(CLAVE, tema);
    } catch {
      /* Sin persistencia el tema durará solo esta sesión: no es crítico. */
    }
  }

  actualizarBoton();
}

/** Cambia al tema opuesto y lo recuerda. */
export function alternarTema() {
  aplicarTema(temaActual() === "dark" ? "light" : "dark");
}

let boton = null;
let etiqueta = null;

/** Deja el botón describiendo la acción que hará al pulsarlo. */
function actualizarBoton() {
  if (!boton) return;

  const destino = temaActual() === "dark" ? "modo día" : "modo noche";
  const texto = `Cambiar a ${destino}`;

  boton.title = texto;
  boton.setAttribute("aria-label", texto);
  if (etiqueta) etiqueta.textContent = texto;
}

/**
 * Conecta el conmutador de tema.
 * @param {{boton: HTMLElement|null, etiqueta?: HTMLElement|null}} elementos
 */
export function iniciarTema({ boton: btn, etiqueta: lbl = null } = {}) {
  boton = btn ?? null;
  etiqueta = lbl;

  // Reaplica el tema ya presente para sincronizar meta y botón sin sobrescribir
  // la preferencia del sistema si el usuario aún no ha elegido.
  aplicarTema(temaActual(), { recordar: false });

  boton?.addEventListener("click", alternarTema);

  consultaSistema.addEventListener("change", (evento) => {
    if (temaGuardado()) return; // El usuario ya decidió: se respeta su elección.
    aplicarTema(evento.matches ? "dark" : "light", { recordar: false });
  });
}
