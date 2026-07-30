/**
 * RadioAlarm · Desbloqueo de audio
 *
 * Los navegadores solo dejan arrancar audio a partir de un gesto del usuario
 * (un clic, una tecla). Eso funciona bien mientras pruebas un tono o una
 * canción, porque siempre lo haces pulsando algo — pero una alarma suena por
 * su cuenta, disparada por un temporizador, sin que nadie toque nada justo
 * antes.
 *
 * La solución habitual: aprovechar el primer gesto que el usuario haga en la
 * aplicación —cualquiera, no tiene que ser sobre un botón de sonido— para
 * despertar de antemano el `AudioContext` del sintetizador y desbloquear el
 * elemento `<audio>` del reproductor. Ambos son instancias únicas y
 * persistentes durante toda la sesión, así que basta con desbloquearlas una
 * vez: siguen desbloqueadas el resto de la sesión, aunque la alarma salte
 * horas después sin que el usuario haya vuelto a tocar la pantalla.
 */

import { asegurarContextoDesbloqueado } from "./sintetizador.js";

/**
 * Un `<audio>` sin `src` no reproduce nada real, así que no basta para que el
 * navegador lo cuente como "ya reproducido tras un gesto". Un WAV en silencio
 * generado al vuelo sí es un audio de verdad, y no pesa nada ni necesita red.
 */
function crearWavSilencioso() {
  const muestras = 1;
  const buffer = new ArrayBuffer(44 + muestras * 2);
  const vista = new DataView(buffer);

  const texto = (posicion, cadena) => {
    for (let i = 0; i < cadena.length; i += 1) vista.setUint8(posicion + i, cadena.charCodeAt(i));
  };

  texto(0, "RIFF");
  vista.setUint32(4, 36 + muestras * 2, true);
  texto(8, "WAVE");
  texto(12, "fmt ");
  vista.setUint32(16, 16, true);
  vista.setUint16(20, 1, true);
  vista.setUint16(22, 1, true);
  vista.setUint32(24, 44100, true);
  vista.setUint32(28, 44100 * 2, true);
  vista.setUint16(32, 2, true);
  vista.setUint16(34, 16, true);
  texto(36, "data");
  vista.setUint32(40, muestras * 2, true);

  return new Blob([buffer], { type: "audio/wav" });
}

/** Reproduce y para al instante un silencio, solo para desbloquear el elemento. */
function desbloquearElementoAudio() {
  const audio = new Audio();
  const url = URL.createObjectURL(crearWavSilencioso());

  audio.src = url;
  audio.volume = 0;

  audio
    .play()
    .then(() => audio.pause())
    .catch(() => {
      /* Si ni con esto arranca, no hay más que intentar: la alarma probará
         de todos modos cuando le toque sonar. */
    })
    .finally(() => URL.revokeObjectURL(url));
}

/** Conecta el desbloqueo al primer gesto del usuario. Se llama una vez al arrancar. */
export function iniciarDesbloqueoAudio() {
  const desbloquear = () => {
    asegurarContextoDesbloqueado();
    desbloquearElementoAudio();
    document.removeEventListener("pointerdown", desbloquear);
    document.removeEventListener("keydown", desbloquear);
  };

  document.addEventListener("pointerdown", desbloquear, { once: true });
  document.addEventListener("keydown", desbloquear, { once: true });
}
