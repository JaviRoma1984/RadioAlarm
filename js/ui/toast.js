/**
 * RadioAlarm · Avisos flotantes
 *
 * Mensajes breves sobre la barra inferior. El contenedor es una región
 * `aria-live`, así que los lectores de pantalla los anuncian solos.
 */

const DURACION_POR_DEFECTO = 2800;

/** Se resuelve al primer uso para no depender del orden de carga de scripts. */
function zona() {
  return document.getElementById("toast-zona");
}

/**
 * Muestra un aviso flotante.
 * @param {string} mensaje
 * @param {{tipo?: "info"|"aviso"|"error", duracion?: number}} opciones
 */
export function toast(mensaje, { tipo = "info", duracion = DURACION_POR_DEFECTO } = {}) {
  const contenedor = zona();
  if (!contenedor) return;

  const elemento = document.createElement("div");
  elemento.className = tipo === "info" ? "toast" : `toast toast--${tipo}`;
  elemento.textContent = mensaje;
  contenedor.append(elemento);

  const retirar = () => {
    elemento.dataset.saliendo = "true";
    elemento.addEventListener("animationend", () => elemento.remove(), { once: true });
    // Red de seguridad si la animación no llega a dispararse.
    setTimeout(() => elemento.remove(), 400);
  };

  setTimeout(retirar, duracion);
}
