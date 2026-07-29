/**
 * RadioAlarm · Punto de entrada
 *
 * Estado del proyecto: Fase 1 — esqueleto, sistema visual y navegación entre
 * vistas. El listado de alarmas llega en la Fase 3 y su editor en la Fase 4.
 */

import { iniciarTema } from "./theme.js";
import { iniciarMedidas } from "./ui/layout.js";
import { iniciarSonido } from "./ui/sonido.js";
import { toast } from "./ui/toast.js";
import { iniciarVistas } from "./ui/vistas.js";

/** Acciones aún sin implementar, con su fase prevista. */
const PENDIENTES = {
  "crear-alarma": "Crear alarmas llega en la Fase 4",
  crono: "El cronómetro llega en la Fase 7",
  "cuenta-atras": "El temporizador de cuenta atrás llega en la Fase 7",
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

/** Conecta las acciones todavía no implementadas para que avisen de su fase. */
function iniciarAccionesPendientes() {
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
  iniciarMedidas();
  iniciarSombraCabecera();
  iniciarSonido();
  iniciarVistas();
  iniciarAccionesPendientes();
}

iniciar();
