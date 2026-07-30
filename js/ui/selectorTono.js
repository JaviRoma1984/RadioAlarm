/**
 * RadioAlarm · Selector de tono
 *
 * Widget reutilizable: pinta el catálogo de tonos como un grupo de radios y
 * reproduce el tono al seleccionarlo, resaltando la opción en amarillo
 * mientras se oye. Lo usan tanto la vista global de Opciones de sonido como el
 * editor de alarma, así que la lógica de reproducir y resaltar vive aquí una
 * sola vez.
 *
 * Cada instancia necesita su propio `name` de grupo de radios. Los `name` de
 * radio son globales al documento: si dos instancias compartieran uno, marcar
 * un tono en una vista desmarcaría el de la otra aunque estuviera oculta.
 */

import { pararTono, reproducirTono } from "../audio/sintetizador.js";
import { TONOS } from "../datos/tonos.js";

/** Margen en el que se considera que dos peticiones son el mismo gesto. */
const MISMO_GESTO_MS = 150;

/**
 * @param {object} opciones
 * @param {HTMLElement} opciones.contenedor Donde se pinta la lista de radios.
 * @param {string} opciones.name Nombre único del grupo de radios.
 * @param {(id: string) => void} opciones.onCambiar Se llama al elegir un tono.
 */
export function crearSelectorTono({ contenedor, name, onCambiar }) {
  let finDeMuestra = null;
  let ultimaMuestra = { id: null, momento: 0 };

  /**
   * Reproduce el tono y lo marca mientras suena.
   *
   * Un `<label>` reenvía el clic al `<input>` que envuelve, así que una sola
   * pulsación puede llegar aquí dos veces —por `change` y por `click`—. La
   * guarda de tiempo evita que el tono se corte y vuelva a empezar.
   */
  function escuchar(id, opcion) {
    const ahora = performance.now();
    if (ultimaMuestra.id === id && ahora - ultimaMuestra.momento < MISMO_GESTO_MS) return;
    ultimaMuestra = { id, momento: ahora };

    clearTimeout(finDeMuestra);
    contenedor
      .querySelectorAll('.opcion[data-sonando="true"]')
      .forEach((otra) => delete otra.dataset.sonando);

    const duracion = reproducirTono(id);
    if (!duracion) return; // navegador sin Web Audio: la selección funciona igual

    opcion.dataset.sonando = "true";
    finDeMuestra = setTimeout(() => delete opcion.dataset.sonando, duracion * 1000);
  }

  /** Silencia la muestra y quita la marca. Al salir de la vista o al guardar. */
  function silenciar() {
    clearTimeout(finDeMuestra);
    pararTono();
    contenedor
      .querySelectorAll('.opcion[data-sonando="true"]')
      .forEach((opcion) => delete opcion.dataset.sonando);
  }

  /** Pinta el catálogo completo, marcando `seleccionado`. */
  function pintar(seleccionado) {
    contenedor.replaceChildren(
      ...TONOS.map((tono) => {
        const etiqueta = document.createElement("label");
        etiqueta.className = "opcion";
        etiqueta.innerHTML = `
          <input type="radio" name="${name}" value="${tono.id}" class="opcion__radio" />
          <span class="opcion__marca" aria-hidden="true"></span>
          <span class="opcion__texto">
            <span class="opcion__nombre">${tono.nombre}</span>
            <span class="opcion__desc">${tono.descripcion}</span>
          </span>
        `;

        const radio = etiqueta.querySelector("input");
        radio.checked = tono.id === seleccionado;
        radio.addEventListener("change", () => {
          onCambiar(tono.id);
          escuchar(tono.id, etiqueta);
        });

        // Volver a pulsar el que ya está elegido no dispara `change`, pero se
        // espera oírlo otra vez.
        etiqueta.addEventListener("click", () => {
          if (radio.checked) escuchar(tono.id, etiqueta);
        });

        return etiqueta;
      }),
    );
  }

  return { pintar, silenciar };
}
