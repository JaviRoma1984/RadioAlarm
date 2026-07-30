/**
 * RadioAlarm · Selector de canción
 *
 * Widget reutilizable: elige un archivo de audio del dispositivo, lo guarda
 * en IndexedDB y pinta una fila con su nombre y los botones Elegir / Escuchar
 * / Quitar. Lo usan tanto la vista global de Opciones de sonido (la canción
 * favorita) como el editor de alarma (la canción de esa alarma en concreto).
 *
 * Se usa `<input type="file">` en vez del selector de carpetas del navegador:
 * funciona igual en escritorio y en móvil (el selector de carpetas no existe
 * en móvil), y no necesita gestionar permisos entre sesiones.
 *
 * El widget no guarda estado propio del "dueño" de la canción: lee y escribe
 * a través de `obtener`/`establecer`, que le da quien lo crea. Así una misma
 * pieza sirve para el favorito global y para el de cada alarma.
 *
 * Nunca borra de IndexedDB el audio que reemplaza o quita. Una alarma nueva
 * parte del favorito global con el mismo id de audio (no uno copiado), así
 * que borrar "el anterior" al elegir uno distinto podría borrar el favorito
 * de otra alarma sin que nadie lo pidiera. El coste es que un audio dejado de
 * usar se queda guardado; sin contar cuántos sitios usan cada id no hay forma
 * segura de saber cuándo borrarlo de verdad.
 */

import { guardarAudio, nuevoIdAudio, obtenerAudio } from "../store/audioBlobs.js";
import { pararVistaPrevia, reproducirBlob } from "../audio/reproductor.js";
import { toast } from "./toast.js";

/**
 * @param {object} opciones
 * @param {HTMLElement} opciones.contenedor Donde se pinta el widget.
 * @param {() => {nombre: string, id: string}|null} opciones.obtener
 * @param {(recurso: {nombre: string, id: string}|null) => void} opciones.establecer
 */
export function crearSelectorCancion({ contenedor, obtener, establecer }) {
  contenedor.innerHTML = `
    <div class="recurso">
      <span class="recurso__valor recurso__valor--vacio" data-parte="valor">Ninguna seleccionada</span>
      <div class="recurso__botones">
        <button type="button" class="btn btn--suave" data-parte="escuchar">Escuchar</button>
        <button type="button" class="btn btn--suave" data-parte="quitar">Quitar</button>
        <button type="button" class="btn btn--suave" data-parte="elegir">Elegir</button>
      </div>
    </div>
    <input type="file" accept="audio/*" hidden data-parte="archivo" />
  `;

  const valor = contenedor.querySelector('[data-parte="valor"]');
  const botonEscuchar = contenedor.querySelector('[data-parte="escuchar"]');
  const botonQuitar = contenedor.querySelector('[data-parte="quitar"]');
  const botonElegir = contenedor.querySelector('[data-parte="elegir"]');
  const inputArchivo = contenedor.querySelector('[data-parte="archivo"]');

  function pintar() {
    const recurso = obtener();

    valor.textContent = recurso?.nombre ?? "Ninguna seleccionada";
    valor.classList.toggle("recurso__valor--vacio", !recurso);
    botonEscuchar.disabled = !recurso;
    botonQuitar.disabled = !recurso;
  }

  async function elegirArchivo(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = ""; // permite volver a elegir el mismo archivo después

    if (!archivo) return;

    const id = nuevoIdAudio();

    try {
      await guardarAudio({ id, nombre: archivo.name, blob: archivo });
    } catch {
      toast("No se pudo guardar la canción: el navegador bloquea el almacenamiento", {
        tipo: "error",
      });
      return;
    }

    establecer({ nombre: archivo.name, id });
    pintar();
  }

  async function escuchar() {
    const recurso = obtener();
    if (!recurso) return;

    const audio = await obtenerAudio(recurso.id);
    if (!audio) {
      toast("Esa canción ya no está disponible", { tipo: "aviso" });
      return;
    }

    try {
      await reproducirBlob(audio.blob);
    } catch {
      toast("No se pudo reproducir la canción", { tipo: "error" });
    }
  }

  function quitar() {
    if (!obtener()) return;

    pararVistaPrevia();
    establecer(null);
    pintar();
  }

  botonElegir.addEventListener("click", () => inputArchivo.click());
  inputArchivo.addEventListener("change", elegirArchivo);
  botonEscuchar.addEventListener("click", escuchar);
  botonQuitar.addEventListener("click", quitar);

  pintar();

  return { pintar, detener: pararVistaPrevia };
}
