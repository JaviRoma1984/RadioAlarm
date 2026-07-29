/**
 * RadioAlarm · Punto de entrada
 *
 * Estado del proyecto: Fase 1 — esqueleto y sistema visual.
 * Las acciones de la barra inferior se conectarán en las fases 3 y 4.
 */

import { iniciarTema } from "./theme.js";
import { toast } from "./ui/toast.js";

/** Acciones de la barra inferior aún sin implementar, con su fase prevista. */
const PENDIENTES = {
  "crear-alarma": "Crear alarmas llega en la Fase 4",
  "elegir-tono": "La biblioteca de tonos llega en la Fase 5",
  "elegir-cancion": "Elegir canciones de tu carpeta llega en la Fase 5",
  "elegir-radio": "Las emisoras de radio llegan en la Fase 5",
};

/** Marca la cabecera cuando el contenido se ha desplazado, para dibujar su borde. */
function iniciarSombraCabecera() {
  const cabecera = document.getElementById("cabecera");
  if (!cabecera) return;

  const actualizar = () => {
    cabecera.dataset.desplazado = String(window.scrollY > 4);
  };

  actualizar();
  window.addEventListener("scroll", actualizar, { passive: true });
}

/** Conecta los botones de la barra inferior. */
function iniciarBarraAcciones() {
  document.querySelectorAll("[data-accion]").forEach((boton) => {
    boton.addEventListener("click", () => {
      const mensaje = PENDIENTES[boton.dataset.accion];
      if (mensaje) toast(mensaje);
    });
  });
}

function iniciar() {
  iniciarTema({
    boton: document.getElementById("btn-tema"),
    etiqueta: document.getElementById("btn-tema-texto"),
  });
  iniciarSombraCabecera();
  iniciarBarraAcciones();
}

iniciar();
