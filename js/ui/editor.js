/**
 * RadioAlarm · Editor de alarma
 *
 * Una sola pantalla para crear y editar alarmas: nombre, hora, repetición (una
 * vez o los días de la semana que se elijan), fuente de sonido, vibración y
 * pospuestos.
 *
 * Igual que en la vista de sonido, los cambios se llevan en un borrador y solo
 * se persisten al pulsar «Guardar cambios»; «Volver atrás» los descarta.
 *
 * El tono no se elige aquí: solo se muestra el que esté puesto como favorito
 * en Opciones de sonido. Esa pantalla es el único sitio donde se escoge, para
 * no duplicar el mismo listado de nueve tonos en dos pantallas distintas. La
 * canción y la emisora sí son propias de cada alarma: parten del favorito
 * global al crearla, pero cada una puede cambiarlas sin afectar a las demás.
 */

import { DIAS_SEMANA, FUENTE, POSPONER, REPETICION, crearAlarma } from "../model/alarma.js";
import { nombreTono } from "../datos/tonos.js";
import { borrarAlarma, guardarAlarma, obtenerAlarma } from "../model/alarmas.js";
import { crearSelectorCancion } from "./selectorCancion.js";
import { crearSelectorEmisora } from "./selectorEmisora.js";
import { configuracionSonido } from "./sonido.js";
import { toast } from "./toast.js";
import { mostrarVista, volverAlInicio } from "./vistas.js";

/** Alarma en edición. Se repone por completo cada vez que se abre la vista. */
let borrador = crearAlarma();

/** `null` al crear una alarma nueva; el id de la alarma cuando se está editando. */
let editandoId = null;

let hayCambios = false;

const selectorCancion = crearSelectorCancion({
  contenedor: document.getElementById("editor-cancion"),
  obtener: () => borrador.sonido.cancion,
  establecer(recurso) {
    borrador.sonido.cancion = recurso;
    marcarCambios();
  },
});

const selectorEmisora = crearSelectorEmisora({
  contenedor: document.getElementById("editor-radio"),
  obtener: () => borrador.sonido.emisora,
  establecer(recurso) {
    borrador.sonido.emisora = recurso;
    marcarCambios();
  },
});

/* -------------------------------------------------------------------------- */
/*  Utilidades                                                                */
/* -------------------------------------------------------------------------- */

/** Hora en punto siguiente a la actual: valor de partida razonable para una alarma nueva. */
function siguienteHoraEnPunto(ahora = new Date()) {
  const fecha = new Date(ahora.getTime());
  fecha.setHours(fecha.getHours() + 1, 0, 0, 0);
  return `${String(fecha.getHours()).padStart(2, "0")}:00`;
}

function marcarCambios(valor = true) {
  hayCambios = valor;
  document.getElementById("btn-guardar-editor")?.classList.toggle("btn--pendiente", valor);
}

/* -------------------------------------------------------------------------- */
/*  Pintado                                                                   */
/* -------------------------------------------------------------------------- */

function pintarDias() {
  const contenedor = document.getElementById("editor-dias");
  if (!contenedor) return;

  contenedor.replaceChildren(
    ...DIAS_SEMANA.map((dia) => {
      const activo = borrador.dias.includes(dia.id);

      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "dia";
      boton.dataset.dia = String(dia.id);
      boton.textContent = dia.corto;
      boton.setAttribute("aria-pressed", String(activo));
      boton.setAttribute("aria-label", dia.nombre);
      boton.classList.toggle("dia--activo", activo);

      return boton;
    }),
  );
}

/**
 * Muestra u oculta el panel de días, animando su alto.
 *
 * `scrollHeight` da el alto real del contenido aunque esté clipado por
 * `overflow: hidden`, así que sirve tanto para saber cuánto crecer al abrir
 * como para partir de ese mismo valor al cerrar (si se partiera de `0px` no
 * habría nada que animar).
 */
function mostrarDias(mostrar) {
  const envoltura = document.getElementById("editor-dias-envoltura");
  if (!envoltura) return;

  envoltura.style.maxHeight = `${envoltura.scrollHeight}px`;
  if (!mostrar) {
    // Fuerza el reflujo para que el navegador registre el alto de partida
    // antes de animar hacia 0; si no, no habría transición que ver.
    void envoltura.offsetHeight;
    envoltura.style.maxHeight = "0px";
  }
}

/** Solo uno de los tres bloques —tono, canción, emisora— está a la vista. */
function mostrarFuente(tipo) {
  const tono = document.getElementById("editor-tono");
  const cancion = document.getElementById("editor-cancion");
  const radio = document.getElementById("editor-radio");

  if (tono) tono.hidden = tipo !== FUENTE.TONO;
  if (cancion) cancion.hidden = tipo !== FUENTE.CANCION;
  if (radio) radio.hidden = tipo !== FUENTE.RADIO;
}

/** El tono no se elige aquí: se muestra el favorito de Opciones de sonido. */
function pintarTono() {
  const nodo = document.getElementById("editor-valor-tono");
  if (nodo) nodo.textContent = nombreTono(configuracionSonido().tono);
}

function pintarPosponer() {
  const veces = document.getElementById("editor-veces-valor");
  const minutos = document.getElementById("editor-minutos-valor");
  const filaMinutos = document.getElementById("editor-minutos-fila");

  if (veces) veces.textContent = String(borrador.posponer.veces);
  if (minutos) minutos.textContent = String(borrador.posponer.minutos);

  // Sin pospuestos no tiene sentido preguntar cada cuánto se repiten.
  if (filaMinutos) filaMinutos.hidden = borrador.posponer.veces === 0;

  document.getElementById("editor-veces-menos")?.toggleAttribute(
    "disabled",
    borrador.posponer.veces <= POSPONER.VECES_MIN,
  );
  document.getElementById("editor-veces-mas")?.toggleAttribute(
    "disabled",
    borrador.posponer.veces >= POSPONER.VECES_MAX,
  );
  document.getElementById("editor-minutos-menos")?.toggleAttribute(
    "disabled",
    borrador.posponer.minutos <= POSPONER.MINUTOS_MIN,
  );
  document.getElementById("editor-minutos-mas")?.toggleAttribute(
    "disabled",
    borrador.posponer.minutos >= POSPONER.MINUTOS_MAX,
  );
}

function pintar() {
  const nombre = document.getElementById("editor-nombre");
  if (nombre) nombre.value = editandoId ? borrador.nombre : "";

  const hora = document.getElementById("editor-hora");
  if (hora) hora.value = borrador.hora;

  document
    .querySelectorAll('#editor-repeticion input[type="radio"]')
    .forEach((radio) => (radio.checked = radio.value === borrador.repeticion));
  // `pintarDias` primero: `mostrarDias` mide `scrollHeight`, así que necesita
  // los 7 botones ya en el DOM para calcular el alto real.
  pintarDias();
  mostrarDias(borrador.repeticion === REPETICION.PERSONALIZADA);

  document
    .querySelectorAll('#editor-fuente input[type="radio"]')
    .forEach((radio) => (radio.checked = radio.value === borrador.sonido.tipo));
  mostrarFuente(borrador.sonido.tipo);
  pintarTono();
  selectorCancion.pintar();
  selectorEmisora.pintar();

  const vibracion = document.getElementById("editor-vibracion");
  if (vibracion) vibracion.checked = borrador.vibracion;

  pintarPosponer();

  document.getElementById("btn-borrar-editor")?.toggleAttribute("hidden", !editandoId);
}

/**
 * Abre el editor.
 * @param {string|null} id `null` para crear una alarma nueva; si no, la que se edita.
 */
function abrir(id) {
  editandoId = id ?? null;

  if (editandoId) {
    const existente = obtenerAlarma(editandoId);

    if (!existente) {
      // La alarma se ha borrado por otra vía entre que se listó y se abrió.
      toast("Esa alarma ya no existe", { tipo: "aviso" });
      volverAlInicio();
      return;
    }

    borrador = structuredClone(existente);
  } else {
    borrador = crearAlarma({ hora: siguienteHoraEnPunto() });
    // La canción y la emisora parten del favorito global; el tono no hace
    // falta copiarlo aquí porque nunca se guarda uno propio por alarma.
    const favoritos = configuracionSonido();
    borrador.sonido.cancion = favoritos.cancion;
    borrador.sonido.emisora = favoritos.emisora;
  }

  marcarCambios(false);
  pintar();
}

/* -------------------------------------------------------------------------- */
/*  Acciones                                                                  */
/* -------------------------------------------------------------------------- */

function ajustarPosponer(campo, delta) {
  const limites =
    campo === "veces"
      ? [POSPONER.VECES_MIN, POSPONER.VECES_MAX]
      : [POSPONER.MINUTOS_MIN, POSPONER.MINUTOS_MAX];

  const [minimo, maximo] = limites;
  const actual = borrador.posponer[campo];
  const siguiente = Math.min(maximo, Math.max(minimo, actual + delta));

  if (siguiente === actual) return;

  borrador.posponer[campo] = siguiente;
  pintarPosponer();
  marcarCambios();
}

function alternarDia(boton) {
  const id = Number(boton.dataset.dia);
  const activo = boton.getAttribute("aria-pressed") === "true";

  boton.setAttribute("aria-pressed", String(!activo));
  boton.classList.toggle("dia--activo", !activo);

  borrador.dias = activo
    ? borrador.dias.filter((dia) => dia !== id)
    : [...borrador.dias, id].sort((a, b) => a - b);

  marcarCambios();
}

/** Detiene cualquier vista previa —canción o emisora— que siguiera sonando. */
function silenciarTodo() {
  selectorCancion.detener();
  selectorEmisora.detener();
}

function guardar() {
  silenciarTodo();

  const tipoElegido = borrador.sonido.tipo;
  // El tono no se elige en este editor: al guardar se sincroniza con el
  // favorito de Opciones de sonido, que es la única fuente de verdad.
  borrador.sonido.tono = configuracionSonido().tono;

  const guardada = guardarAlarma(borrador);

  if (!guardada) {
    toast("No se pudo guardar: el navegador bloquea el almacenamiento", { tipo: "error" });
    return;
  }

  const sinDias =
    guardada.repeticion === REPETICION.PERSONALIZADA && guardada.dias.length === 0;
  // Si se dejó puesta la pestaña Canción o Radio sin elegir nada válido, el
  // modelo cae al tono al guardar. Se avisa para que no parezca que la
  // elección se ha perdido sin motivo.
  const sonidoSustituido = tipoElegido !== FUENTE.TONO && guardada.sonido.tipo === FUENTE.TONO;

  if (sinDias) {
    toast(`«${guardada.nombre}» guardada, pero no sonará: no has marcado ningún día`, {
      tipo: "aviso",
    });
  } else if (sonidoSustituido) {
    const fuente = tipoElegido === FUENTE.CANCION ? "una canción" : "una emisora";
    toast(`«${guardada.nombre}» guardada con el tono: no habías elegido ${fuente}`, {
      tipo: "aviso",
    });
  } else {
    toast(`Alarma «${guardada.nombre}» guardada`);
  }

  marcarCambios(false);
  volverAlInicio();
}

function volver() {
  silenciarTodo();
  if (hayCambios) toast("Cambios sin guardar descartados", { tipo: "aviso" });
  volverAlInicio();
}

function borrarDesdeEditor() {
  if (!editandoId) return;

  if (!window.confirm(`¿Borrar la alarma «${borrador.nombre}» de las ${borrador.hora}?`)) {
    return;
  }

  silenciarTodo();

  if (borrarAlarma(editandoId)) toast(`Alarma «${borrador.nombre}» borrada`);
  volverAlInicio();
}

/* -------------------------------------------------------------------------- */
/*  Arranque                                                                  */
/* -------------------------------------------------------------------------- */

export function iniciarEditor() {
  document.getElementById("editor-nombre")?.addEventListener("input", (evento) => {
    borrador.nombre = evento.target.value;
    marcarCambios();
  });

  document.getElementById("editor-hora")?.addEventListener("input", (evento) => {
    // El navegador solo entrega "" o una hora completa "HH:MM": nunca un valor
    // parcial a medio escribir, así que no hace falta validar aquí.
    if (evento.target.value) borrador.hora = evento.target.value;
    marcarCambios();
  });

  document.getElementById("editor-repeticion")?.addEventListener("change", (evento) => {
    const radio = evento.target.closest('input[type="radio"]');
    if (!radio) return;

    borrador.repeticion = radio.value;
    mostrarDias(radio.value === REPETICION.PERSONALIZADA);
    marcarCambios();
  });

  document.getElementById("editor-dias")?.addEventListener("click", (evento) => {
    const boton = evento.target.closest(".dia");
    if (boton) alternarDia(boton);
  });

  document.getElementById("editor-fuente")?.addEventListener("change", (evento) => {
    const radio = evento.target.closest('input[type="radio"]');
    if (!radio) return;

    borrador.sonido.tipo = radio.value;
    mostrarFuente(radio.value);
    marcarCambios();
  });

  document.getElementById("editor-vibracion")?.addEventListener("change", (evento) => {
    borrador.vibracion = evento.target.checked;
    marcarCambios();
  });

  document
    .getElementById("editor-veces-menos")
    ?.addEventListener("click", () => ajustarPosponer("veces", -1));
  document
    .getElementById("editor-veces-mas")
    ?.addEventListener("click", () => ajustarPosponer("veces", 1));
  document
    .getElementById("editor-minutos-menos")
    ?.addEventListener("click", () => ajustarPosponer("minutos", -1));
  document
    .getElementById("editor-minutos-mas")
    ?.addEventListener("click", () => ajustarPosponer("minutos", 1));

  document.getElementById("btn-guardar-editor")?.addEventListener("click", guardar);
  document.getElementById("btn-volver-editor")?.addEventListener("click", volver);
  document.getElementById("btn-borrar-editor")?.addEventListener("click", borrarDesdeEditor);

  document.addEventListener("vista:cambiada", (evento) => {
    if (evento.detail.vista === "editor") abrir(evento.detail.id ?? null);
    else silenciarTodo();
  });
}

/** Abre el editor sobre una alarma nueva. Lo usa el botón flotante «+». */
export function abrirEditorNuevo() {
  mostrarVista("editor");
}

/** Abre el editor sobre una alarma existente. Lo usa el listado. */
export function abrirEditorAlarma(id) {
  mostrarVista("editor", { id });
}
