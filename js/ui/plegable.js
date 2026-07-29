/**
 * RadioAlarm · Lista plegable
 *
 * Convierte un contenedor en una lista que muestra solo sus primeros elementos
 * y se despliega con un botón, animando el alto.
 *
 * Por qué se mide el alto en JavaScript: `display: none` no se puede animar y
 * `height: auto` tampoco es interpolable de forma fiable en todos los
 * navegadores que nos interesan (Safari de iPhone, entre ellos). Así que se
 * calcula el alto plegado y el desplegado en píxeles y se transiciona
 * `max-height`. Al terminar de abrirse se retira el límite, para que la lista
 * pueda crecer luego sin quedarse recortada.
 *
 * Los elementos ocultos se marcan `inert`: siguen en el DOM para poder
 * animarlos, pero no reciben foco ni los anuncian los lectores de pantalla.
 */

/** Margen de gracia para que el cerco de foco del último visible no se recorte. */
const HOLGURA = 3;

/** Red de seguridad si `transitionend` no llegara a dispararse. */
const ESPERA_MAXIMA = 450;

/**
 * @param {object} opciones
 * @param {HTMLElement} opciones.contenedor Lista cuyos hijos se plegarán.
 * @param {HTMLElement} opciones.boton Botón que despliega y encoge.
 * @param {HTMLElement} [opciones.etiqueta] Nodo de texto del botón.
 * @param {number} [opciones.visibles] Cuántos elementos se ven plegado.
 * @param {(total: number) => string} [opciones.textoAbrir]
 * @param {string} [opciones.textoCerrar]
 */
export function crearPlegable({
  contenedor,
  boton,
  etiqueta = null,
  visibles = 3,
  textoAbrir = (total) => `Ver los ${total}`,
  textoCerrar = "Ver menos",
}) {
  let plegado = true;

  /** Alto que ocupa el contenedor mostrando solo los elementos visibles. */
  function altoPlegado(elementos) {
    // `visibles: 0` esconde la lista entera: el contenedor queda a cero.
    if (visibles <= 0) return 0;

    const arriba = contenedor.getBoundingClientRect().top;
    const corte = elementos[visibles - 1].getBoundingClientRect().bottom;
    return corte - arriba + HOLGURA;
  }

  function pintar({ animar = true } = {}) {
    const elementos = [...contenedor.children];
    const sobran = elementos.length > visibles;

    // Con pocos elementos no hay nada que plegar: fuera botón y fuera límite.
    boton.hidden = !sobran;
    if (!sobran) {
      contenedor.style.maxHeight = "";
      elementos.forEach((elemento) => (elemento.inert = false));
      return;
    }

    elementos.forEach((elemento, indice) => {
      elemento.inert = plegado && indice >= visibles;
    });

    boton.setAttribute("aria-expanded", String(!plegado));
    if (etiqueta) {
      etiqueta.textContent = plegado ? textoAbrir(elementos.length) : textoCerrar;
    }

    // Si la vista está oculta no hay caja que medir; se recalculará al abrirla.
    if (!contenedor.offsetParent) return;

    if (!animar) contenedor.style.transition = "none";

    if (plegado) {
      // Para animar hacia abajo hace falta partir de un alto concreto.
      if (!contenedor.style.maxHeight || contenedor.style.maxHeight === "none") {
        contenedor.style.maxHeight = `${contenedor.scrollHeight}px`;
        void contenedor.offsetHeight; // fuerza el reflujo
      }
      contenedor.style.maxHeight = `${altoPlegado(elementos)}px`;
    } else {
      contenedor.style.maxHeight = `${contenedor.scrollHeight}px`;

      const soltarLimite = () => {
        if (!plegado) contenedor.style.maxHeight = "none";
      };
      contenedor.addEventListener("transitionend", soltarLimite, { once: true });
      setTimeout(soltarLimite, ESPERA_MAXIMA);
    }

    if (!animar) {
      void contenedor.offsetHeight;
      contenedor.style.transition = "";
    }
  }

  boton.addEventListener("click", () => {
    plegado = !plegado;
    pintar();
  });

  return {
    /**
     * Recalcula el pliegue. Se llama al repintar la lista o al abrir la vista.
     * @param {{desplegado?: boolean|null}} opciones Fuerza el estado inicial.
     */
    refrescar({ desplegado = null } = {}) {
      if (desplegado !== null) plegado = !desplegado;
      pintar({ animar: false });
    },
  };
}
