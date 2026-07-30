/**
 * RadioAlarm · Navegación entre vistas
 *
 * La app es de una sola página: cada pantalla es una `<section data-vista="...">`
 * dentro del contenido y solo una está visible. Aquí se centraliza el cambio,
 * junto con los dos detalles que lo acompañan: el botón flotante solo tiene
 * sentido en el listado de alarmas, y el botón de la barra que corresponde a la
 * vista abierta se marca como activo.
 *
 * Las fases siguientes añadirán vistas nuevas (editor de alarma, cronómetro,
 * cuenta atrás) sin tocar este módulo: basta declarar su `data-vista`.
 */

/** Vista que se muestra al arrancar la app. */
export const VISTA_INICIAL = "alarmas";

let actual = VISTA_INICIAL;

export function vistaActual() {
  return actual;
}

/**
 * Muestra una vista y oculta el resto.
 * @param {string} nombre Valor del atributo `data-vista` de la sección.
 * @param {object} [detalle] Datos extra para quien escuche `vista:cambiada`;
 *   por ejemplo `{ id }` para abrir el editor sobre una alarma concreta.
 */
export function mostrarVista(nombre, detalle = {}) {
  document.querySelectorAll("[data-vista]").forEach((seccion) => {
    seccion.hidden = seccion.dataset.vista !== nombre;
  });

  // El botón de crear alarma solo aparece sobre el listado.
  const fab = document.getElementById("fab-crear");
  if (fab) fab.hidden = nombre !== "alarmas";

  // Resalta el botón de la barra que lleva a esta vista, si lo hay.
  document.querySelectorAll(".bar-btn").forEach((boton) => {
    const activo = boton.dataset.vistaDestino === nombre;
    boton.classList.toggle("bar-btn--activo", activo);
    if (activo) boton.setAttribute("aria-current", "page");
    else boton.removeAttribute("aria-current");
  });

  actual = nombre;
  window.scrollTo({ top: 0 });

  // Cada vista se refresca al abrirse escuchando este evento, sin que este
  // módulo tenga que conocerlas.
  document.dispatchEvent(
    new CustomEvent("vista:cambiada", { detail: { ...detalle, vista: nombre } }),
  );
}

/** Vuelve al listado de alarmas. */
export function volverAlInicio() {
  mostrarVista(VISTA_INICIAL);
}

/** Conecta los botones que declaran `data-vista-destino`. */
export function iniciarVistas() {
  document.querySelectorAll("[data-vista-destino]").forEach((boton) => {
    boton.addEventListener("click", () => mostrarVista(boton.dataset.vistaDestino));
  });

  mostrarVista(VISTA_INICIAL);
}
