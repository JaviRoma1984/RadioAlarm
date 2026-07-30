/**
 * RadioAlarm · Selector de emisora
 *
 * Widget reutilizable: nombre y URL del stream, con un botón para probar que
 * suena antes de guardarlo. Lo usan tanto Opciones de sonido (la emisora
 * favorita) como el editor de alarma (la de esa alarma en concreto).
 *
 * No incluye una lista de emisoras predefinidas: una URL de stream se queda
 * anticuada con facilidad (la emisora cambia de proveedor, cierra el stream
 * antiguo…), y ofrecer una que ya no funcione es peor que no ofrecer ninguna.
 * El usuario escribe la suya y la prueba con el propio botón antes de guardar.
 *
 * Igual que en `selectorCancion.js`, el widget no guarda el estado: lee y
 * escribe a través de `obtener`/`establecer`.
 */

import { pararVistaPrevia, probarEmisora } from "../audio/reproductor.js";
import { toast } from "./toast.js";

/**
 * @param {object} opciones
 * @param {HTMLElement} opciones.contenedor
 * @param {() => {nombre: string, url: string}|null} opciones.obtener
 * @param {(recurso: {nombre: string, url: string}|null) => void} opciones.establecer
 */
export function crearSelectorEmisora({ contenedor, obtener, establecer }) {
  contenedor.innerHTML = `
    <div class="campo-emisora">
      <input type="text" class="campo-emisora__input" placeholder="Nombre de la emisora"
        data-parte="nombre" maxlength="60" aria-label="Nombre de la emisora" />
      <input type="url" class="campo-emisora__input" placeholder="https://…stream de la emisora"
        data-parte="url" aria-label="URL del stream" />
    </div>
    <p class="panel__ayuda">
      Tiene que ser <code>https://</code> para que también funcione en el móvil una vez
      publicada la aplicación.
    </p>
    <div class="recurso__botones">
      <button type="button" class="btn btn--suave" data-parte="probar">Probar</button>
      <button type="button" class="btn btn--suave" data-parte="quitar">Quitar</button>
    </div>
  `;

  const campoNombre = contenedor.querySelector('[data-parte="nombre"]');
  const campoUrl = contenedor.querySelector('[data-parte="url"]');
  const botonProbar = contenedor.querySelector('[data-parte="probar"]');
  const botonQuitar = contenedor.querySelector('[data-parte="quitar"]');

  let sonando = false;

  function marcarSonando(valor) {
    sonando = valor;
    botonProbar.textContent = valor ? "Detener" : "Probar";
  }

  function pintar() {
    const recurso = obtener();
    campoNombre.value = recurso?.nombre ?? "";
    campoUrl.value = recurso?.url ?? "";
    botonQuitar.disabled = !recurso;
  }

  function actualizar() {
    const nombre = campoNombre.value.trim();
    const url = campoUrl.value.trim();

    // Se guarda lo que haya, aunque esté a medias: el modelo ya valida al
    // persistir y cae al tono si falta alguno de los dos campos.
    establecer(nombre || url ? { nombre, url } : null);
    botonQuitar.disabled = !nombre && !url;
  }

  async function probar() {
    if (sonando) {
      pararVistaPrevia();
      marcarSonando(false);
      return;
    }

    const url = campoUrl.value.trim();
    if (!url) {
      toast("Escribe primero la URL del stream", { tipo: "aviso" });
      return;
    }

    try {
      await probarEmisora(url);
      marcarSonando(true);
    } catch {
      toast("No se ha podido reproducir: revisa la URL", { tipo: "error" });
    }
  }

  function quitar() {
    pararVistaPrevia();
    marcarSonando(false);
    campoNombre.value = "";
    campoUrl.value = "";
    establecer(null);
    botonQuitar.disabled = true;
  }

  campoNombre.addEventListener("input", actualizar);
  campoUrl.addEventListener("input", actualizar);
  botonProbar.addEventListener("click", probar);
  botonQuitar.addEventListener("click", quitar);

  pintar();

  return {
    pintar,
    detener: () => {
      pararVistaPrevia();
      marcarSonando(false);
    },
  };
}
