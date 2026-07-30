/**
 * RadioAlarm · Punto de entrada
 *
 * Estado del proyecto: Fase 6 de 10 — el motor de disparo ya hace sonar las
 * alarmas de verdad, con pantalla propia, pospuesto, vibración y Wake Lock.
 */

import { iniciarDesbloqueoAudio } from "./audio/desbloqueo.js";
import { iniciarMotor } from "./motor/motor.js";
import { iniciarVigilia } from "./motor/vigilia.js";
import { iniciarTema } from "./theme.js";
import { iniciarListaAlarmas } from "./ui/alarmas.js";
import { iniciarEditor } from "./ui/editor.js";
import { iniciarMedidas } from "./ui/layout.js";
import { iniciarSonido } from "./ui/sonido.js";
import { toast } from "./ui/toast.js";
import { iniciarVistas } from "./ui/vistas.js";

/** Acciones aún sin implementar, con su fase prevista. */
const PENDIENTES = {
  crono: "El cronómetro llega en la Fase 7",
  "cuenta-atras": "El temporizador de cuenta atrás llega en la Fase 7",
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
  iniciarListaAlarmas();
  iniciarSonido();
  iniciarEditor();
  iniciarVistas();
  iniciarAccionesPendientes();
  iniciarDesbloqueoAudio();
  iniciarVigilia();
  iniciarMotor();
}

iniciar();
