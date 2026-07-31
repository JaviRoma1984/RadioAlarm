/**
 * RadioAlarm · Punto de entrada
 *
 * Estado del proyecto: Fase 8 de 10 — instalable como PWA, además de las
 * alarmas, el cronómetro y la cuenta atrás. Las tres fuentes de sonido: tono,
 * canción propia y emisora de radio, y las tres pantallas de tiempo: alarmas,
 * crono y cuenta atrás.
 */

import { iniciarDesbloqueoAudio } from "./audio/desbloqueo.js";
import { iniciarMotor } from "./motor/motor.js";
import { iniciarVigilia } from "./motor/vigilia.js";
import { iniciarPwa } from "./pwa.js";
import { iniciarTema } from "./theme.js";
import { iniciarListaAlarmas } from "./ui/alarmas.js";
import { iniciarCrono } from "./ui/crono.js";
import { iniciarCuentaAtras } from "./ui/cuentaAtras.js";
import { iniciarEditor } from "./ui/editor.js";
import { iniciarMedidas } from "./ui/layout.js";
import { iniciarSonido } from "./ui/sonido.js";
import { iniciarVistas } from "./ui/vistas.js";

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
  iniciarCrono();
  iniciarCuentaAtras();
  iniciarVistas();
  iniciarDesbloqueoAudio();
  iniciarVigilia();
  iniciarMotor();
  iniciarPwa();
}

iniciar();
