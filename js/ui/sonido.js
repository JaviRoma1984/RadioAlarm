/**
 * RadioAlarm · Vista de opciones de sonido
 *
 * Aquí se eligen las tres fuentes que podrá usar una alarma: el tono, la
 * canción y la emisora. Los cambios se llevan en un borrador y solo se
 * persisten al pulsar «Guardar cambios»; «Volver atrás» los descarta.
 *
 * Estado: la selección de tono ya es real y se guarda. La elección de canción y
 * de emisora necesita el selector de archivos y el reproductor de streams, que
 * llegan en la Fase 5.
 */

import { leer, escribir } from "../store.js";
import { crearPlegable } from "./plegable.js";
import { toast } from "./toast.js";
import { volverAlInicio } from "./vistas.js";

const CLAVE = "sonido";

/**
 * Tonos visibles con la lista encogida. A cero: el apartado muestra solo la
 * descripción, el tono elegido y el botón «Explorar tonos», que despliega todos.
 */
const TONOS_VISIBLES = 0;

/**
 * Catálogo de tonos incluidos.
 *
 * En la Fase 5 cada uno se generará por síntesis con Web Audio en lugar de
 * empaquetar archivos de audio: no dependemos de bancos de sonido con licencia,
 * no pesan nada, funcionan sin conexión y la subida progresiva de volumen sale
 * de serie. Los sonidos de alarma clásicos son ondas simples, así que se
 * reproducen bien sintetizados.
 *
 * Los tonos de fábrica del móvil NO se pueden leer desde la web: viven en una
 * carpeta protegida del sistema y solo `RingtoneManager` (nativo) los expone.
 * La Fase 10, con el envoltorio Android, añadirá la lista completa del sistema.
 * Mientras tanto, la Fase 5 permitirá importar tus propios archivos de audio.
 */
export const TONOS = [
  {
    id: "clasico",
    nombre: "Clásico",
    descripcion: "Timbre de despertador de cuerda, trino de dos notas",
  },
  {
    id: "amanecer",
    nombre: "Amanecer",
    descripcion: "Campanilleo suave que sube de volumen poco a poco",
  },
  {
    id: "digital",
    nombre: "Digital",
    descripcion: "Pitido agudo y repetitivo, imposible de ignorar",
  },
  {
    id: "campanas",
    nombre: "Campanas",
    descripcion: "Repique corto y cálido",
  },
  {
    id: "marimba",
    nombre: "Marimba",
    descripcion: "Arpegio de madera, notas ascendentes",
  },
  {
    id: "radar",
    nombre: "Radar",
    descripcion: "Pulso doble que se va acelerando",
  },
  {
    id: "sonar",
    nombre: "Sónar",
    descripcion: "Tono profundo con eco largo",
  },
  {
    id: "sirena",
    nombre: "Sirena",
    descripcion: "Barrido que sube y baja sin parar",
  },
  {
    id: "goteo",
    nombre: "Goteo",
    descripcion: "Pulsos cortos y espaciados, para despertar sin sobresalto",
  },
];

/** Tono preseleccionado mientras el usuario no elija otro. */
export const TONO_POR_DEFECTO = "clasico";

const POR_DEFECTO = {
  tono: TONO_POR_DEFECTO,
  cancion: null, // { nombre } cuando la Fase 5 permita elegirla
  emisora: null, // { nombre, url } cuando la Fase 5 permita elegirla
};

/** Configuración de sonido guardada, completada con los valores por defecto. */
export function configuracionSonido() {
  const configuracion = { ...POR_DEFECTO, ...(leer(CLAVE) ?? {}) };

  // Siempre tiene que haber un tono válido seleccionado. Si lo guardado apunta
  // a un tono que ya no existe (catálogo cambiado, dato manipulado), se vuelve
  // al de fábrica en lugar de quedarse sin ninguno marcado.
  if (!TONOS.some((tono) => tono.id === configuracion.tono)) {
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

function pintarTonos() {
  const lista = document.getElementById("lista-tonos");
  if (!lista) return;

  lista.replaceChildren(
    ...TONOS.map((tono) => {
      const etiqueta = document.createElement("label");
      etiqueta.className = "opcion";
      etiqueta.innerHTML = `
        <input type="radio" name="tono" value="${tono.id}" class="opcion__radio" />
        <span class="opcion__marca" aria-hidden="true"></span>
        <span class="opcion__texto">
          <span class="opcion__nombre">${tono.nombre}</span>
          <span class="opcion__desc">${tono.descripcion}</span>
        </span>
      `;

      const radio = etiqueta.querySelector("input");
      radio.checked = tono.id === borrador.tono;
      radio.addEventListener("change", () => {
        borrador.tono = tono.id;
        pintarRecursos(); // refleja el cambio en la línea del tono elegido
        marcarCambios();
      });

      return etiqueta;
    }),
  );

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

/** Nombre del tono elegido, para verlo con la lista cerrada. */
function nombreTono(id) {
  return TONOS.find((tono) => tono.id === id)?.nombre ?? id;
}

/** Refresca los rótulos de tono, canción y emisora con lo que haya en el borrador. */
function pintarRecursos() {
  const tono = document.getElementById("valor-tono");
  if (tono) tono.textContent = nombreTono(borrador.tono);

  const cancion = document.getElementById("valor-cancion");
  if (cancion) {
    cancion.textContent = borrador.cancion?.nombre ?? "Ninguna seleccionada";
    cancion.classList.toggle("recurso__valor--vacio", !borrador.cancion);
  }

  const emisora = document.getElementById("valor-emisora");
  if (emisora) {
    emisora.textContent = borrador.emisora?.nombre ?? "Ninguna seleccionada";
    emisora.classList.toggle("recurso__valor--vacio", !borrador.emisora);
  }
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
}

/* -------------------------------------------------------------------------- */
/*  Acciones                                                                  */
/* -------------------------------------------------------------------------- */

function guardar() {
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
  if (hayCambios) toast("Cambios sin guardar descartados", { tipo: "aviso" });
  refrescarSonido();
  volverAlInicio();
}

export function iniciarSonido() {
  refrescarSonido();

  document.getElementById("btn-guardar-sonido")?.addEventListener("click", guardar);
  document.getElementById("btn-volver-sonido")?.addEventListener("click", volver);

  // Al abrir la vista se descarta cualquier borrador anterior.
  document.addEventListener("vista:cambiada", (evento) => {
    if (evento.detail.vista === "sonido") refrescarSonido();
  });
}
