/**
 * RadioAlarm · Vista del listado de alarmas
 *
 * Pantalla principal: una tarjeta por alarma con su hora, su nombre, cuándo
 * suena la próxima vez, el interruptor de activación y el botón de borrar.
 *
 * Se repinta cuando el repositorio avisa de un cambio y cuando se vuelve a esta
 * vista. Aparte, un temporizador refresca solo la línea de «cuánto falta», sin
 * reconstruir nada más.
 *
 * El botón flotante y el toque sobre una tarjeta abren el editor de alarma
 * (js/ui/editor.js): el primero para crear una nueva, el segundo para editarla.
 */

import { nombreTono } from "../datos/tonos.js";
import { FUENTE, proximoDisparo, resumenRepeticion, tiempoHasta } from "../model/alarma.js";
import { alCambiar, alternarActiva, borrarAlarma, listarAlarmas } from "../model/alarmas.js";
import { abrirEditorAlarma, abrirEditorNuevo } from "./editor.js";
import { configuracionSonido } from "./sonido.js";
import { toast } from "./toast.js";
import { vistaActual } from "./vistas.js";

/** Cada cuánto se refresca la línea de «cuánto falta». */
const REFRESCO_MS = 30_000;

/** Última lista pintada, para refrescar los tiempos sin volver a consultar. */
let ultimas = [];

/* -------------------------------------------------------------------------- */
/*  Textos                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * «Tono · Clásico», «Radio · LOS40»…
 *
 * El tono y la emisora no se guardan de verdad por alarma —cada uno se elige
 * una sola vez en Opciones de sonido—, así que aquí se muestra siempre el
 * favorito actual y no el que quedó guardado en la alarma la última vez que
 * se editó. La canción sí es propia de cada alarma.
 */
function descripcionSonido(alarma) {
  const { tipo, cancion } = alarma.sonido;
  const favoritos = configuracionSonido();

  if (tipo === FUENTE.CANCION && cancion) return `Canción · ${cancion.nombre}`;
  if (tipo === FUENTE.RADIO && favoritos.emisora) return `Radio · ${favoritos.emisora.nombre}`;
  return `Tono · ${nombreTono(favoritos.tono)}`;
}

/** Línea inferior de la tarjeta: cuándo sonará, o por qué no va a sonar. */
function textoCuando(alarma, ahora = new Date()) {
  if (!alarma.activa) return "Desactivada";

  const cuando = proximoDisparo(alarma, ahora);
  if (!cuando) return "Sin días marcados";

  return tiempoHasta(cuando, ahora);
}

/* -------------------------------------------------------------------------- */
/*  Pintado                                                                   */
/* -------------------------------------------------------------------------- */

const PLANTILLA_FILA = `
  <button class="alarma__cuerpo" type="button" data-accion-alarma="editar">
    <span class="alarma__hora tabular"></span>
    <span class="alarma__nombre"></span>
    <span class="alarma__meta"></span>
    <span class="alarma__cuando"></span>
  </button>
  <div class="alarma__acciones">
    <label class="interruptor">
      <input type="checkbox" class="interruptor__campo" />
      <span class="interruptor__pista"><span class="interruptor__bola"></span></span>
    </label>
    <button class="icon-btn icon-btn--sutil" type="button" data-accion-alarma="borrar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 7h16M9.5 7V4.75h5V7M6.5 7l.9 12.1a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
        <path d="M10.5 11v6M13.5 11v6" />
      </svg>
    </button>
  </div>
`;

function crearFila(alarma) {
  const fila = document.createElement("li");
  fila.className = "alarma";
  fila.dataset.id = alarma.id;
  if (!alarma.activa) fila.dataset.inactiva = "true";

  // La estructura va por innerHTML porque es fija; los textos del usuario se
  // asignan luego con textContent, que no interpreta HTML.
  fila.innerHTML = PLANTILLA_FILA;

  fila.querySelector(".alarma__hora").textContent = alarma.hora;
  fila.querySelector(".alarma__nombre").textContent = alarma.nombre;
  fila.querySelector(".alarma__meta").textContent =
    `${resumenRepeticion(alarma)} · ${descripcionSonido(alarma)}`;
  fila.querySelector(".alarma__cuando").textContent = textoCuando(alarma);

  const cuerpo = fila.querySelector(".alarma__cuerpo");
  cuerpo.title = "Editar la alarma";
  cuerpo.setAttribute("aria-label", `Editar la alarma ${alarma.nombre} de las ${alarma.hora}`);

  const campo = fila.querySelector(".interruptor__campo");
  campo.checked = alarma.activa;
  campo.setAttribute(
    "aria-label",
    `${alarma.activa ? "Desactivar" : "Activar"} la alarma ${alarma.nombre}`,
  );

  fila
    .querySelector('[data-accion-alarma="borrar"]')
    .setAttribute("aria-label", `Borrar la alarma ${alarma.nombre}`);

  return fila;
}

function pintarLista() {
  const lista = document.getElementById("lista-alarmas");
  const vacio = document.getElementById("alarmas-vacio");
  if (!lista || !vacio) return;

  // Al reconstruir la lista se pierde el foco. Si estaba en un interruptor se
  // devuelve después, para no dejar tirado a quien navegue con el teclado.
  const idConFoco = document.activeElement?.matches?.(".interruptor__campo")
    ? document.activeElement.closest(".alarma")?.dataset.id
    : null;

  ultimas = listarAlarmas();

  lista.hidden = ultimas.length === 0;
  vacio.hidden = ultimas.length > 0;
  lista.replaceChildren(...ultimas.map(crearFila));

  if (idConFoco) {
    lista
      .querySelector(`[data-id="${idConFoco}"] .interruptor__campo`)
      ?.focus({ preventScroll: true });
  }
}

/** Refresca solo la línea de «cuánto falta» de cada tarjeta. */
function actualizarTiempos() {
  if (vistaActual() !== "alarmas") return;

  const lista = document.getElementById("lista-alarmas");
  if (!lista) return;

  const ahora = new Date();
  for (const alarma of ultimas) {
    const linea = lista.querySelector(`[data-id="${alarma.id}"] .alarma__cuando`);
    if (linea) linea.textContent = textoCuando(alarma, ahora);
  }
}

/* -------------------------------------------------------------------------- */
/*  Acciones                                                                  */
/* -------------------------------------------------------------------------- */

function borrar(id) {
  const alarma = ultimas.find((otra) => otra.id === id);
  if (!alarma) return;

  // Borrar una alarma no se puede deshacer, así que se pregunta antes.
  if (!window.confirm(`¿Borrar la alarma «${alarma.nombre}» de las ${alarma.hora}?`)) return;

  if (borrarAlarma(id)) toast(`Alarma «${alarma.nombre}» borrada`);
}

/* -------------------------------------------------------------------------- */
/*  Arranque                                                                  */
/* -------------------------------------------------------------------------- */

export function iniciarListaAlarmas() {
  const lista = document.getElementById("lista-alarmas");

  // Un solo oyente para toda la lista: las tarjetas se crean y destruyen.
  lista?.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-accion-alarma]");
    const id = boton?.closest(".alarma")?.dataset.id;
    if (!id) return;

    if (boton.dataset.accionAlarma === "borrar") borrar(id);
    if (boton.dataset.accionAlarma === "editar") abrirEditorAlarma(id);
  });

  lista?.addEventListener("change", (evento) => {
    if (!evento.target.matches(".interruptor__campo")) return;

    const id = evento.target.closest(".alarma")?.dataset.id;
    if (id) alternarActiva(id); // el repositorio avisa y la lista se repinta
  });

  document.getElementById("fab-crear")?.addEventListener("click", abrirEditorNuevo);

  alCambiar(pintarLista);

  document.addEventListener("vista:cambiada", (evento) => {
    if (evento.detail.vista === "alarmas") pintarLista();
  });

  setInterval(actualizarTiempos, REFRESCO_MS);

  pintarLista();
}
