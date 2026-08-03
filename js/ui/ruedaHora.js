/**
 * RadioAlarm · Selector de hora en rueda
 *
 * Sustituye al `<input type="time">` nativo del editor: su selector emergente
 * lo dibuja el sistema, no se puede tocar por CSS, y es justo lo que no
 * convencía. Esto en cambio son dos columnas de la propia app que se
 * deslizan como una ruleta, con ajuste automático (`scroll-snap`) al número
 * que quede más centrado.
 *
 * A propósito no da vueltas sin fin: llegada a 23 o a 59 se para, no salta a
 * 0. Mantenerlo así de simple —sin duplicar la lista para simular un bucle—
 * evita bordes raros por ahora; se puede añadir después si hace falta.
 */

/** Alto de cada número, en rem —tiene que coincidir con el CSS. */
const ALTURA_ITEM_REM = 3.25;

function alturaItemEnPx() {
  const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return ALTURA_ITEM_REM * remPx;
}

/**
 * Una columna deslizable de 0 a `maximo`, con ajuste al número centrado.
 * @param {object} opciones
 * @param {HTMLElement} opciones.contenedor
 * @param {number} opciones.maximo
 * @param {(valor: number) => void} opciones.onAsentado Se llama cuando el
 *   deslizamiento se detiene, con el número que ha quedado centrado.
 */
function crearColumna({ contenedor, maximo, onAsentado }) {
  contenedor.replaceChildren(
    ...Array.from({ length: maximo + 1 }, (_, valor) => {
      const item = document.createElement("div");
      item.className = "rueda-hora__item";
      item.textContent = String(valor).padStart(2, "0");
      return item;
    }),
  );

  let valorActual = 0;
  let temporizador = null;
  // `irA` (llamada desde `pintar`, al abrir el editor) también dispara el
  // evento `scroll`: sin esto, abrir una alarma existente se marcaría sola
  // como "con cambios sin guardar" antes de que el usuario tocara nada.
  //
  // Se apaga con su propio temporizador, NO esperando a que llegue el
  // evento `scroll`: si `irA` coloca la columna en el valor que ya tenía
  // (scrollTop sin cambio real), el navegador no dispara ningún `scroll`, y
  // la bandera se quedaría encendida para siempre —dejando la rueda sin
  // responder al primer gesto real del usuario—.
  let programatico = false;
  let temporizadorProgramatico = null;

  function marcarSeleccionado(valor) {
    contenedor
      .querySelectorAll('[data-seleccionado="true"]')
      .forEach((el) => delete el.dataset.seleccionado);
    contenedor.children[valor]?.setAttribute("data-seleccionado", "true");
  }

  function irA(valor, { suave = false } = {}) {
    programatico = true;
    clearTimeout(temporizadorProgramatico);
    // Más que los 120ms del debounce del scroll: así, si sí llega a haber un
    // evento `scroll` real por este cambio, su comprobación (más abajo)
    // todavía ve la bandera encendida y lo ignora correctamente.
    temporizadorProgramatico = setTimeout(() => {
      programatico = false;
    }, 200);

    valorActual = Math.max(0, Math.min(maximo, valor));
    contenedor.scrollTo({
      top: valorActual * alturaItemEnPx(),
      behavior: suave ? "smooth" : "auto",
    });
    marcarSeleccionado(valorActual);
  }

  // El propio `scroll-snap` del CSS ya ajusta la posición visual; aquí solo
  // se espera a que el deslizamiento se detenga (nada de scroll en 120ms)
  // para leer en qué número ha quedado y avisar del cambio.
  contenedor.addEventListener("scroll", () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      if (programatico) return;

      const valor = Math.max(
        0,
        Math.min(maximo, Math.round(contenedor.scrollTop / alturaItemEnPx())),
      );
      valorActual = valor;
      marcarSeleccionado(valor);
      onAsentado(valor);
    }, 120);
  });

  return { irA };
}

/**
 * @param {object} opciones
 * @param {HTMLElement} opciones.contenedorHoras
 * @param {HTMLElement} opciones.contenedorMinutos
 * @param {(hora: string) => void} opciones.onCambiar Con el nuevo valor, en
 *   formato `"HH:MM"`, cada vez que cualquiera de las dos columnas se asienta.
 */
export function crearRuedaHora({ contenedorHoras, contenedorMinutos, onCambiar }) {
  let horas = 0;
  let minutos = 0;

  function avisar() {
    onCambiar(`${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`);
  }

  const columnaHoras = crearColumna({
    contenedor: contenedorHoras,
    maximo: 23,
    onAsentado(valor) {
      horas = valor;
      avisar();
    },
  });

  const columnaMinutos = crearColumna({
    contenedor: contenedorMinutos,
    maximo: 59,
    onAsentado(valor) {
      minutos = valor;
      avisar();
    },
  });

  /** Coloca las dos columnas en la hora dada, sin animación ni avisar del cambio. */
  function pintar(horaTexto) {
    const [h, m] = horaTexto.split(":").map(Number);
    horas = h;
    minutos = m;
    columnaHoras.irA(h);
    columnaMinutos.irA(m);
  }

  return { pintar };
}
