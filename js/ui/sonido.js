/**
 * RadioAlarm · Vista de opciones de sonido
 *
 * El tono es una única configuración global: se elige aquí y ninguna alarma
 * puede tener uno distinto (por eso su editor solo lo muestra, no lo deja
 * cambiar). La canción y la emisora, en cambio, son solo las *favoritas*: la
 * de partida al crear una alarma, que cada alarma puede cambiar después en su
 * propio editor sin afectar a este favorito.
 *
 * Los cambios se llevan en un borrador y solo se persisten al pulsar «Guardar
 * cambios»; «Volver atrás» los descarta.
 *
 * Las tres fuentes son reales: el tono suena al elegirlo, la canción se
 * guarda en el dispositivo (`js/store/audioBlobs.js`) y la emisora se puede
 * probar antes de guardarla.
 */

import { TONO_POR_DEFECTO, existeTono, nombreTono } from "../datos/tonos.js";
import { leer, escribir } from "../store.js";
import { crearPlegable } from "./plegable.js";
import { crearSelectorCancion } from "./selectorCancion.js";
import { crearSelectorEmisora } from "./selectorEmisora.js";
import { crearSelectorTono } from "./selectorTono.js";
import { toast } from "./toast.js";
import { volverAlInicio } from "./vistas.js";

const CLAVE = "sonido";

/**
 * Tonos visibles con la lista encogida. A cero: el apartado muestra solo la
 * descripción, el tono elegido y el botón «Explorar tonos», que despliega todos.
 */
const TONOS_VISIBLES = 0;

const POR_DEFECTO = {
  tono: TONO_POR_DEFECTO,
  cancion: null, // { nombre, id }
  emisora: null, // { nombre, url }
};

/** Configuración de sonido guardada, completada con los valores por defecto. */
export function configuracionSonido() {
  const configuracion = { ...POR_DEFECTO, ...(leer(CLAVE) ?? {}) };

  // Siempre tiene que haber un tono válido seleccionado. Si lo guardado apunta
  // a un tono que ya no existe (catálogo cambiado, dato manipulado), se vuelve
  // al de fábrica en lugar de quedarse sin ninguno marcado.
  if (!existeTono(configuracion.tono)) {
    configuracion.tono = TONO_POR_DEFECTO;
  }

  return configuracion;
}

/** Borrador en edición: copia de lo guardado hasta que se pulse «Guardar». */
let borrador = { ...POR_DEFECTO };
let hayCambios = false;

/* -------------------------------------------------------------------------- */
/*  Pintado                                                                   */
/* -------------------------------------------------------------------------- */

/** Plegable de la lista de tonos; se crea la primera vez que se pinta. */
let plegableTonos = null;

/** El propio grupo de radios necesita un `name` que no choque con el del editor. */
const selectorTono = crearSelectorTono({
  contenedor: document.getElementById("lista-tonos"),
  name: "sonido-tono",
  onCambiar(id) {
    borrador.tono = id;
    pintarRecursos(); // refleja el cambio en la línea del tono elegido
    marcarCambios();
  },
});

const selectorCancion = crearSelectorCancion({
  contenedor: document.getElementById("sonido-cancion"),
  obtener: () => borrador.cancion,
  establecer(recurso) {
    borrador.cancion = recurso;
    marcarCambios();
  },
});

const selectorEmisora = crearSelectorEmisora({
  contenedor: document.getElementById("sonido-emisora"),
  name: "sonido-emisora",
  obtener: () => borrador.emisora,
  establecer(recurso) {
    borrador.emisora = recurso;
    marcarCambios();
  },
});

function pintarTonos() {
  const lista = document.getElementById("lista-tonos");
  if (!lista) return;

  selectorTono.pintar(borrador.tono);

  plegableTonos ??= crearPlegable({
    contenedor: lista,
    boton: document.getElementById("btn-plegar-tonos"),
    etiqueta: document.getElementById("btn-plegar-tonos-texto"),
    visibles: TONOS_VISIBLES,
    textoAbrir: () => "Explorar tonos",
    textoCerrar: "Ocultar tonos",
  });

  // La lista arranca cerrada: el tono elegido se ve en su propia línea.
  plegableTonos.refrescar({ desplegado: false });
}

/** Refresca la línea del tono elegido (canción y emisora se pintan solas). */
function pintarRecursos() {
  const tono = document.getElementById("valor-tono");
  if (tono) tono.textContent = nombreTono(borrador.tono);
}

/** Activa el botón de guardar en cuanto hay algo que guardar. */
function marcarCambios(valor = true) {
  hayCambios = valor;
  document.getElementById("btn-guardar-sonido")?.classList.toggle("btn--pendiente", valor);
}

/** Recarga el borrador desde lo guardado y repinta. Se llama al abrir la vista. */
export function refrescarSonido() {
  borrador = configuracionSonido();
  marcarCambios(false);
  pintarTonos();
  pintarRecursos();
  selectorCancion.pintar();
  selectorEmisora.pintar();
}

/* -------------------------------------------------------------------------- */
/*  Acciones                                                                  */
/* -------------------------------------------------------------------------- */

/** Detiene cualquier vista previa —tono, canción o emisora— que siguiera sonando. */
function silenciarTodo() {
  selectorTono.silenciar();
  selectorCancion.detener();
  selectorEmisora.detener();
}

function guardar() {
  silenciarTodo();

  if (!hayCambios) {
    toast("No había cambios que guardar");
    volverAlInicio();
    return;
  }

  if (escribir(CLAVE, borrador)) {
    marcarCambios(false);
    toast(`Guardado · tono ${nombreTono(borrador.tono)}`);
    volverAlInicio();
    return;
  }

  // Si no se pudo guardar se sigue en la pantalla: llevar al usuario al inicio
  // le haría creer que sus cambios están a salvo cuando se han perdido.
  toast("No se pudo guardar: el navegador bloquea el almacenamiento", {
    tipo: "error",
  });
}

function volver() {
  silenciarTodo();
  if (hayCambios) toast("Cambios sin guardar descartados", { tipo: "aviso" });
  refrescarSonido();
  volverAlInicio();
}

export function iniciarSonido() {
  refrescarSonido();

  document.getElementById("btn-guardar-sonido")?.addEventListener("click", guardar);
  document.getElementById("btn-volver-sonido")?.addEventListener("click", volver);

  // Al abrir la vista se descarta cualquier borrador anterior; al salir de ella
  // se corta cualquier tono de muestra que siguiera sonando.
  document.addEventListener("vista:cambiada", (evento) => {
    if (evento.detail.vista === "sonido") refrescarSonido();
    else silenciarTodo();
  });
}
