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
import { toast } from "./toast.js";
import { volverAlInicio } from "./vistas.js";

const CLAVE = "sonido";

/** Catálogo de tonos. En la Fase 5 cada uno apuntará a su archivo de audio. */
export const TONOS = [
  {
    id: "clasico",
    nombre: "Clásico",
    descripcion: "Timbre de despertador tradicional",
  },
  {
    id: "amanecer",
    nombre: "Amanecer",
    descripcion: "Empieza flojo y sube poco a poco",
  },
  {
    id: "digital",
    nombre: "Digital",
    descripcion: "Pitido agudo y repetitivo",
  },
  {
    id: "campanas",
    nombre: "Campanas",
    descripcion: "Repique corto y cálido",
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
  return { ...POR_DEFECTO, ...(leer(CLAVE) ?? {}) };
}

/** Borrador en edición: copia de lo guardado hasta que se pulse «Guardar». */
let borrador = { ...POR_DEFECTO };
let hayCambios = false;

/* -------------------------------------------------------------------------- */
/*  Pintado                                                                   */
/* -------------------------------------------------------------------------- */

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
        marcarCambios();
      });

      return etiqueta;
    }),
  );
}

/** Refresca los rótulos de canción y emisora con lo que haya en el borrador. */
function pintarRecursos() {
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
    toast("No hay cambios que guardar");
    return;
  }

  if (escribir(CLAVE, borrador)) {
    marcarCambios(false);
    const nombre = TONOS.find((t) => t.id === borrador.tono)?.nombre ?? borrador.tono;
    toast(`Guardado · tono ${nombre}`);
  } else {
    toast("No se pudo guardar: el navegador bloquea el almacenamiento", {
      tipo: "error",
    });
  }
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
