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
/** Marca local: si el usuario ya llegó a abrir la pantalla de autoarranque. */
const CLAVE_AUTOARRANQUE_ABIERTO = "nativo.autoarranque-abierto";

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

/**
 * Solo existe dentro del envoltorio Android (ver js/nativo.js); en el
 * navegador `window.Capacitor` no existe y esto no hace nada.
 */
function pluginAlarma() {
  return window.Capacitor?.Plugins?.AlarmScheduler ?? null;
}

/**
 * Cuatro permisos que Android puede negar en silencio, cada uno con su
 * propio motivo por el que la alarma dejaría de sonar o de mostrarse bien
 * con el móvil bloqueado o la aplicación cerrada. En vez de un botón por
 * permiso, hay uno solo: pide el primero que falte de esta lista, en este
 * orden, y al volver de los ajustes del sistema (`vista:cambiada` o
 * `visibilitychange`, ya conectados más abajo) se vuelve a comprobar sola
 * y pide el siguiente que toque, sin que el usuario tenga que buscar nada.
 */
const PERMISOS_NATIVOS = [
  {
    etiqueta: "Notificaciones",
    tiene: (nativo) => nativo.tienePermisoNotificaciones(),
    solicitar: (nativo) => nativo.solicitarPermisoNotificaciones(),
  },
  {
    etiqueta: "Alarmas exactas",
    tiene: (nativo) => nativo.tienePermisoAlarmasExactas(),
    solicitar: (nativo) => nativo.solicitarPermisoAlarmasExactas(),
  },
  {
    etiqueta: "Pantalla completa",
    tiene: (nativo) => nativo.tienePermisoPantallaCompleta(),
    solicitar: (nativo) => nativo.solicitarPermisoPantallaCompleta(),
  },
  {
    etiqueta: "Ignorar la optimización de batería",
    tiene: (nativo) => nativo.tieneExencionBateria(),
    solicitar: (nativo) => nativo.solicitarExencionBateria(),
  },
  {
    etiqueta: "Autoarranque / actividad en segundo plano",
    // No hay ninguna API de Android para comprobar esto —son pantallas
    // propias de ColorOS, no del sistema—: se confía en que, si el usuario
    // llegó a abrirla, la puso como toca. Por eso "tiene" no pregunta al
    // plugin nativo, sino a esta marca local.
    tiene: () => Promise.resolve({ concedido: Boolean(leer(CLAVE_AUTOARRANQUE_ABIERTO)) }),
    solicitar: async (nativo) => {
      await nativo.abrirAjustesAutoarranque();
      escribir(CLAVE_AUTOARRANQUE_ABIERTO, true);
    },
    instruccion:
      "No es un permiso de Android, sino un ajuste propio de tu fabricante (autoarranque " +
      "o actividad en segundo plano): al pulsar el botón se abre esa pantalla —el nombre " +
      "exacto varía—; búscalo y ponlo en «Permitir». Se da por hecho en cuanto se abre una vez.",
    textoBoton: "Abrir ajuste",
  },
];

/** El permiso que el botón del aviso pediría ahora mismo, si se pulsa. */
let permisoPendiente = null;

async function actualizarAvisoPermiso() {
  const nativo = pluginAlarma();
  const aviso = document.getElementById("aviso-permiso-alarma");
  const texto = document.getElementById("aviso-permiso-alarma-texto");
  const boton = document.getElementById("btn-permiso-todos");
  if (!aviso) return;

  if (!nativo) {
    aviso.hidden = true;
    return;
  }

  for (const permiso of PERMISOS_NATIVOS) {
    // Uno a uno y en orden, no en paralelo: en cuanto se encuentra el
    // primero que falta ya no hace falta comprobar los siguientes.
    const { concedido } = await permiso.tiene(nativo).catch(() => ({ concedido: true }));
    if (!concedido) {
      permisoPendiente = permiso;
      aviso.hidden = false;
      if (texto) {
        texto.textContent =
          permiso.instruccion ??
          `Falta: ${permiso.etiqueta}. Pulsa el botón y concede lo que te pida el ` +
            "sistema; al volver aquí, se pedirá solo lo que siga faltando.";
      }
      if (boton) boton.textContent = permiso.textoBoton ?? "Conceder permiso";
      return;
    }
  }

  permisoPendiente = null;
  aviso.hidden = true;
}

/**
 * Registro de la última alarma nativa, paso a paso. Solo en la app de
 * Android: es una herramienta de depuración para ver dónde se rompe la
 * cadena cuando una alarma no suena con la app cerrada, sin tener que
 * conectar el móvil a un ordenador.
 */
async function actualizarDiagnostico() {
  const nativo = pluginAlarma();
  const panel = document.getElementById("panel-diagnostico");
  const texto = document.getElementById("diagnostico-texto");
  if (!panel) return;

  if (!nativo) {
    panel.hidden = true;
    return;
  }

  panel.hidden = false;

  try {
    const { texto: contenido } = await nativo.leerRegistro();
    if (texto) texto.textContent = contenido;
  } catch {
    if (texto) texto.textContent = "(no se pudo leer el registro)";
  }
}

/** Recarga el borrador desde lo guardado y repinta. Se llama al abrir la vista. */
export function refrescarSonido() {
  borrador = configuracionSonido();
  marcarCambios(false);
  pintarTonos();
  pintarRecursos();
  selectorCancion.pintar();
  selectorEmisora.pintar();
  actualizarAvisoPermiso();
  actualizarDiagnostico();
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

  document.getElementById("btn-permiso-todos")?.addEventListener("click", async () => {
    const nativo = pluginAlarma();
    if (!nativo || !permisoPendiente) return;

    await permisoPendiente.solicitar(nativo).catch(() => {});
    // El de notificaciones resuelve al momento, con el diálogo del propio
    // sistema; los demás abren una pantalla de ajustes por encima, y el
    // resultado no llega hasta volver aquí —por "vista:cambiada" o
    // "visibilitychange", más abajo—. Refrescar ya de paso no hace daño.
    actualizarAvisoPermiso();
  });

  document.getElementById("btn-diagnostico-actualizar")?.addEventListener("click", actualizarDiagnostico);

  document.getElementById("btn-diagnostico-borrar")?.addEventListener("click", async () => {
    await pluginAlarma()?.borrarRegistro().catch(() => {});
    actualizarDiagnostico();
  });

  // Al abrir la vista se descarta cualquier borrador anterior; al salir de ella
  // se corta cualquier tono de muestra que siguiera sonando.
  document.addEventListener("vista:cambiada", (evento) => {
    if (evento.detail.vista === "sonido") refrescarSonido();
    else silenciarTodo();
  });

  // Concedido el permiso desde los ajustes del sistema (fuera de la app), al
  // volver a ella conviene refrescar el aviso sin esperar a cambiar de vista.
  // También sirve para ver el registro recién actualizado si la alarma
  // acaba de sonar mientras la app estaba en segundo plano.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      actualizarAvisoPermiso();
      actualizarDiagnostico();
    }
  });
}
