/**
 * RadioAlarm · Selector de emisora
 *
 * Mismo patrón que `selectorTono.js`: una lista plegada por defecto —con
 * "Emisora elegida" siempre visible y un botón "Explorar emisoras" que la
 * despliega— y selección al estilo radio, que suena en cuanto se elige.
 *
 * La lista trae unas cuantas emisoras de serie (`js/datos/emisoras.js`) y
 * termina con una opción «Personalizada», que revela dos campos de texto para
 * que el usuario escriba el nombre y la URL de la suya y la pruebe antes de
 * guardarla.
 *
 * Lo usan tanto Opciones de sonido (la emisora favorita) como el editor de
 * alarma (la de esa alarma en concreto). El widget no guarda estado propio
 * del "dueño": lee y escribe a través de `obtener`/`establecer`.
 */

import { pararVistaPrevia, probarEmisora } from "../audio/reproductor.js";
import { EMISORAS } from "../datos/emisoras.js";
import { crearPlegable } from "./plegable.js";
import { toast } from "./toast.js";

const ID_PERSONALIZADA = "personalizada";
/** Margen en el que se considera que dos peticiones son el mismo gesto. */
const MISMO_GESTO_MS = 150;

/**
 * @param {object} opciones
 * @param {HTMLElement} opciones.contenedor Donde se pinta el widget.
 * @param {string} opciones.name Nombre único del grupo de radios.
 * @param {() => {nombre: string, url: string}|null} opciones.obtener
 * @param {(recurso: {nombre: string, url: string}|null) => void} opciones.establecer
 */
export function crearSelectorEmisora({ contenedor, name, obtener, establecer }) {
  contenedor.innerHTML = `
    <div class="recurso">
      <span class="recurso__etiqueta">Emisora elegida</span>
      <span class="recurso__valor recurso__valor--vacio" data-parte="valor">Ninguna seleccionada</span>
    </div>

    <div class="selector-emisora__plegar">
      <button type="button" class="btn-plegar" data-parte="plegar" aria-expanded="false">
        <span data-parte="plegar-texto">Explorar emisoras</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m6 9.5 6 6 6-6" />
        </svg>
      </button>
    </div>

    <div class="opciones opciones--plegable" data-parte="lista" role="radiogroup" aria-label="Emisora"></div>

    <div class="campo-emisora" data-parte="personalizada" hidden>
      <input type="text" class="campo-emisora__input" placeholder="Nombre de la emisora"
        data-parte="nombre" maxlength="60" aria-label="Nombre de la emisora" />
      <input type="url" class="campo-emisora__input" placeholder="https://…stream de la emisora"
        data-parte="url" aria-label="URL del stream" />
      <p class="panel__ayuda">
        Tiene que ser <code>https://</code> para que también funcione en el móvil una vez
        publicada la aplicación.
      </p>
    </div>

    <div class="recurso__botones">
      <button type="button" class="btn btn--suave" data-parte="probar">Probar</button>
      <button type="button" class="btn btn--suave" data-parte="quitar">Quitar</button>
    </div>
  `;

  const valor = contenedor.querySelector('[data-parte="valor"]');
  const lista = contenedor.querySelector('[data-parte="lista"]');
  const personalizada = contenedor.querySelector('[data-parte="personalizada"]');
  const campoNombre = contenedor.querySelector('[data-parte="nombre"]');
  const campoUrl = contenedor.querySelector('[data-parte="url"]');
  const botonProbar = contenedor.querySelector('[data-parte="probar"]');
  const botonQuitar = contenedor.querySelector('[data-parte="quitar"]');

  let sonando = false;
  let ultimaMuestra = { id: null, momento: 0 };
  let plegable = null;

  /**
   * Se ha pulsado «Personalizada» y aún no se ha escrito nada. Sin esta marca,
   * "nada guardado todavía" y "personalizada vacía" serían indistinguibles —
   * las dos son `obtener() === null`— y los campos se ocultarían solos justo
   * después de pulsar la opción para escribir en ellos.
   */
  let modoPersonalizada = false;

  /** Qué opción de la lista corresponde a lo guardado ahora mismo, o al modo en curso. */
  function idSeleccionado() {
    const recurso = obtener();
    if (recurso) {
      const preset = EMISORAS.find((e) => e.nombre === recurso.nombre && e.url === recurso.url);
      return preset ? preset.id : ID_PERSONALIZADA;
    }

    return modoPersonalizada ? ID_PERSONALIZADA : null;
  }

  function marcarSonando(valorBoton) {
    sonando = valorBoton;
    botonProbar.textContent = valorBoton ? "Detener" : "Probar";
  }

  /** El `.opcion` de una opción, buscado en el momento —nunca guardado de antes. */
  function opcionPorId(id) {
    return lista.querySelector(`.opcion__radio[value="${id}"]`)?.closest(".opcion") ?? null;
  }

  /**
   * Reproduce una URL y resalta la opción que la eligió mientras suena.
   *
   * Busca el elemento a resaltar por `id` en el momento de marcarlo, no antes:
   * quien llama a `escuchar` normalmente acaba de llamar a `repintar()`, que
   * reconstruye toda la lista —cualquier referencia a un `.opcion` capturada
   * antes de eso ya apunta a un nodo fuera del DOM cuando la promesa resuelve.
   */
  function escuchar(id, url) {
    const ahora = performance.now();
    if (ultimaMuestra.id === id && ahora - ultimaMuestra.momento < MISMO_GESTO_MS) return;
    ultimaMuestra = { id, momento: ahora };

    lista
      .querySelectorAll('.opcion[data-sonando="true"]')
      .forEach((otra) => delete otra.dataset.sonando);

    probarEmisora(url)
      .then(() => {
        const opcion = opcionPorId(id);
        if (opcion) opcion.dataset.sonando = "true";
        marcarSonando(true);
      })
      .catch(() => {
        toast("No se ha podido reproducir: revisa la URL", { tipo: "error" });
        marcarSonando(false);
      });
  }

  function detener() {
    pararVistaPrevia();
    marcarSonando(false);
    lista
      .querySelectorAll('.opcion[data-sonando="true"]')
      .forEach((opcion) => delete opcion.dataset.sonando);
  }

  function pintarLista() {
    const activo = idSeleccionado();

    lista.replaceChildren(
      ...EMISORAS.map((emisora) => {
        const etiqueta = document.createElement("label");
        etiqueta.className = "opcion";
        etiqueta.innerHTML = `
          <input type="radio" name="${name}" value="${emisora.id}" class="opcion__radio" />
          <span class="opcion__marca" aria-hidden="true"></span>
          <span class="opcion__texto">
            <span class="opcion__nombre">${emisora.nombre}</span>
            <span class="opcion__desc">${emisora.descripcion}</span>
          </span>
        `;

        const radio = etiqueta.querySelector("input");
        radio.checked = emisora.id === activo;
        radio.addEventListener("change", () => {
          modoPersonalizada = false;
          establecer({ nombre: emisora.nombre, url: emisora.url });
          repintar();
          escuchar(emisora.id, emisora.url);
        });

        // Volver a pulsar la que ya está elegida no dispara `change`, pero se
        // espera oírla otra vez.
        etiqueta.addEventListener("click", () => {
          if (radio.checked) escuchar(emisora.id, emisora.url);
        });

        return etiqueta;
      }),
      (() => {
        const etiqueta = document.createElement("label");
        etiqueta.className = "opcion";
        etiqueta.innerHTML = `
          <input type="radio" name="${name}" value="${ID_PERSONALIZADA}" class="opcion__radio" />
          <span class="opcion__marca" aria-hidden="true"></span>
          <span class="opcion__texto">
            <span class="opcion__nombre">Personalizada</span>
            <span class="opcion__desc">Escribe el nombre y la URL de tu propia emisora</span>
          </span>
        `;

        const radio = etiqueta.querySelector("input");
        radio.checked = activo === ID_PERSONALIZADA;
        radio.addEventListener("change", () => {
          const veniaDePersonalizada = activo === ID_PERSONALIZADA;

          detener();
          modoPersonalizada = true;
          // Si se venía de un preset, se empieza en blanco para escribir la
          // propia; si ya había una personalizada guardada, se conserva (la
          // rellenará `repintar` a partir de `obtener()`).
          if (!veniaDePersonalizada) establecer(null);
          repintar();
          campoNombre.focus();
        });

        return etiqueta;
      })(),
    );

    plegable ??= crearPlegable({
      contenedor: lista,
      boton: contenedor.querySelector('[data-parte="plegar"]'),
      etiqueta: contenedor.querySelector('[data-parte="plegar-texto"]'),
      visibles: 0,
      textoAbrir: () => "Explorar emisoras",
      textoCerrar: "Ocultar emisoras",
    });
    plegable.refrescar({ desplegado: false });
  }

  /** Repinta a partir del estado actual (dato guardado + `modoPersonalizada`). */
  function repintar() {
    const recurso = obtener();
    const activo = idSeleccionado();

    valor.textContent = recurso?.nombre ?? "Ninguna seleccionada";
    valor.classList.toggle("recurso__valor--vacio", !recurso);
    botonQuitar.disabled = !recurso;

    pintarLista();

    personalizada.hidden = activo !== ID_PERSONALIZADA;
    // Se limpian también al ocultarlos: si no, un valor antiguo invisible
    // reaparecería la próxima vez que se vuelva a elegir Personalizada.
    campoNombre.value = activo === ID_PERSONALIZADA ? recurso?.nombre ?? "" : "";
    campoUrl.value = activo === ID_PERSONALIZADA ? recurso?.url ?? "" : "";
  }

  /**
   * Repinta desde fuera —al abrir la vista que contiene este widget—, con
   * datos que pueden ser de otra alarma distinta a la última vez. Se sale
   * primero de «Personalizada vacía»: esa marca solo tiene sentido dentro de
   * una misma sesión de edición, nunca heredada de la anterior.
   */
  function pintar() {
    modoPersonalizada = false;
    repintar();
  }

  function actualizarPersonalizada() {
    const nombre = campoNombre.value.trim();
    const url = campoUrl.value.trim();

    establecer(nombre || url ? { nombre, url } : null);
    valor.textContent = nombre || "Ninguna seleccionada";
    valor.classList.toggle("recurso__valor--vacio", !nombre);
    botonQuitar.disabled = !nombre && !url;
  }

  function probar() {
    if (sonando) {
      detener();
      return;
    }

    const recurso = obtener();
    if (!recurso?.url) {
      toast("Elige una emisora o escribe la URL de la tuya", { tipo: "aviso" });
      return;
    }

    escuchar(idSeleccionado(), recurso.url);
  }

  function quitar() {
    detener();
    modoPersonalizada = false;
    establecer(null);
    repintar();
  }

  campoNombre.addEventListener("input", actualizarPersonalizada);
  campoUrl.addEventListener("input", actualizarPersonalizada);
  botonProbar.addEventListener("click", probar);
  botonQuitar.addEventListener("click", quitar);

  pintar();

  return { pintar, detener };
}
