/**
 * RadioAlarm · Tonos como audio real, para el envoltorio Android
 *
 * `js/audio/sintetizador.js` genera los 9 tonos con Web Audio en el
 * navegador —osciladores programados en tiempo real, sin ningún archivo—.
 * Eso funciona perfectamente mientras la WebView esté viva, pero
 * `AlarmService` (nativo, Java) necesita poder hacer sonar un tono aunque la
 * app esté completamente cerrada, sin WebView ni JS en marcha. La única
 * forma de que Android reproduzca un tono sin depender de Web Audio es
 * tener el sonido ya grabado en un archivo.
 *
 * Este script "renderiza" cada patrón del sintetizador a PCM de verdad,
 * muestra a muestra, con las mismas frecuencias, duraciones y envolventes
 * que su equivalente en `js/audio/sintetizador.js` —osciladores por fase
 * continua en vez de nodos de Web Audio, pero la misma matemática—, y lo
 * guarda como WAV en los recursos nativos (`res/raw/tono_<id>.wav`), listo
 * para que `AlarmService` lo reproduzca con `MediaPlayer` en bucle.
 *
 * Si algún día cambian los patrones en `sintetizador.js`, hay que reflejar
 * el mismo cambio aquí y volver a ejecutar:
 *
 *     node tools/generar-tonos.mjs
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const CARPETA_RAW = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "android",
  "app",
  "src",
  "main",
  "res",
  "raw",
);

const FRECUENCIA_MUESTREO = 44100;

/** Igual que VOLUMEN_MAESTRO en sintetizador.js: volumen general de la síntesis. */
const VOLUMEN_MAESTRO = 0.28;

/* -------------------------------------------------------------------------- */
/*  Síntesis por fase continua                                                */
/* -------------------------------------------------------------------------- */

/** Valor de la onda en el ciclo de fase dado (fase en ciclos, no en radianes). */
function onda(tipo, faseCiclos) {
  const frac = faseCiclos - Math.floor(faseCiclos);

  switch (tipo) {
    case "square":
      return frac < 0.5 ? 1 : -1;
    case "sawtooth":
      return 2 * frac - 1;
    case "triangle":
      return 4 * Math.abs(frac - 0.5) - 1;
    default: // "sine"
      return Math.sin(2 * Math.PI * faseCiclos);
  }
}

/**
 * Fase acumulada (en ciclos) en el instante `t`, con `frecuencia` constante o
 * en rampa lineal hacia `frecuenciaFinal` a lo largo de `duracion` —igual que
 * `oscilador.frequency.linearRampToValueAtTime` en Web Audio—.
 */
function faseAcumulada(t, frecuencia, frecuenciaFinal, duracion) {
  if (frecuenciaFinal === null) return frecuencia * t;

  const pendiente = (frecuenciaFinal - frecuencia) / duracion;
  return frecuencia * t + (pendiente * t * t) / 2;
}

/**
 * Envolvente de amplitud: rampa lineal de 0.0001 a `volumen` durante
 * `ataque`, y rampa exponencial de `volumen` a 0.0001 en lo que queda de
 * `duracion` —el mismo diseño que `nota()` en sintetizador.js—.
 */
function envolvente(t, duracion, volumen, ataque) {
  if (t <= ataque) return 0.0001 + (volumen - 0.0001) * (t / ataque);

  const progreso = (t - ataque) / (duracion - ataque);
  return volumen * Math.pow(0.0001 / volumen, progreso);
}

/** Suma una nota al buffer compartido del patrón —los nodos de Web Audio se mezclan igual, sumando—. */
function agregarNota(buffer, inicio, { frecuencia, duracion, tipo = "sine", volumen = 1, ataque = 0.005, frecuenciaFinal = null }) {
  const muestraInicio = Math.round(inicio * FRECUENCIA_MUESTREO);
  const numMuestras = Math.round(duracion * FRECUENCIA_MUESTREO);

  for (let i = 0; i < numMuestras; i += 1) {
    const indice = muestraInicio + i;
    if (indice < 0 || indice >= buffer.length) continue;

    const t = i / FRECUENCIA_MUESTREO;
    const env = envolvente(t, duracion, volumen, ataque);
    const fase = faseAcumulada(t, frecuencia, frecuenciaFinal, duracion);
    buffer[indice] += onda(tipo, fase) * env;
  }
}

/* -------------------------------------------------------------------------- */
/*  Patrones — mismos datos que PATRONES en js/audio/sintetizador.js          */
/* -------------------------------------------------------------------------- */

const PATRONES = {
  clasico(buffer, inicio) {
    const paso = 0.075;
    const golpes = 14;

    for (let i = 0; i < golpes; i += 1) {
      agregarNota(buffer, inicio + i * paso, {
        frecuencia: i % 2 ? 720 : 960,
        duracion: paso * 0.95,
        tipo: "triangle",
        volumen: 0.85,
      });
    }

    return golpes * paso + 0.2;
  },

  amanecer(buffer, inicio) {
    const notas = [523.25, 659.25, 783.99, 1046.5];

    notas.forEach((frecuencia, i) => {
      agregarNota(buffer, inicio + i * 0.28, {
        frecuencia,
        duracion: 1,
        tipo: "sine",
        volumen: 0.3 + i * 0.16,
        ataque: 0.14,
      });
    });

    return notas.length * 0.28 + 0.9;
  },

  digital(buffer, inicio) {
    const paso = 0.18;
    const pitidos = 6;

    for (let i = 0; i < pitidos; i += 1) {
      agregarNota(buffer, inicio + i * paso, {
        frecuencia: 2093,
        duracion: 0.085,
        tipo: "square",
        volumen: 0.45,
      });
    }

    return pitidos * paso + 0.15;
  },

  campanas(buffer, inicio) {
    for (const retardo of [0, 0.55]) {
      agregarNota(buffer, inicio + retardo, { frecuencia: 659.25, duracion: 1.6, tipo: "sine", volumen: 0.85 });
      agregarNota(buffer, inicio + retardo, { frecuencia: 987.77, duracion: 1.1, tipo: "sine", volumen: 0.35 });
      agregarNota(buffer, inicio + retardo, { frecuencia: 1318.5, duracion: 0.65, tipo: "sine", volumen: 0.18 });
    }

    return 2.3;
  },

  marimba(buffer, inicio) {
    const notas = [523.25, 622.25, 783.99, 1046.5, 783.99];

    notas.forEach((frecuencia, i) => {
      agregarNota(buffer, inicio + i * 0.14, { frecuencia, duracion: 0.45, tipo: "triangle", volumen: 0.75 });
      agregarNota(buffer, inicio + i * 0.14, { frecuencia: frecuencia * 2, duracion: 0.16, tipo: "sine", volumen: 0.2 });
    });

    return notas.length * 0.14 + 0.45;
  },

  radar(buffer, inicio) {
    let momento = inicio;
    let hueco = 0.44;

    for (let i = 0; i < 5; i += 1) {
      agregarNota(buffer, momento, { frecuencia: 1200, duracion: 0.07, volumen: 0.75 });
      agregarNota(buffer, momento + 0.11, { frecuencia: 1200, duracion: 0.07, volumen: 0.55 });

      momento += hueco;
      hueco = Math.max(0.17, hueco * 0.78);
    }

    return momento - inicio + 0.2;
  },

  sonar(buffer, inicio) {
    for (const [retardo, volumen] of [
      [0, 0.9],
      [0.75, 0.4],
      [1.4, 0.16],
    ]) {
      agregarNota(buffer, inicio + retardo, { frecuencia: 233.08, duracion: 1.5, tipo: "sine", volumen, ataque: 0.02 });
    }

    return 2.6;
  },

  sirena(buffer, inicio) {
    for (let i = 0; i < 2; i += 1) {
      const momento = inicio + i * 1.1;

      agregarNota(buffer, momento, { frecuencia: 520, frecuenciaFinal: 1040, duracion: 0.55, tipo: "sawtooth", volumen: 0.32, ataque: 0.05 });
      agregarNota(buffer, momento + 0.55, { frecuencia: 1040, frecuenciaFinal: 520, duracion: 0.55, tipo: "sawtooth", volumen: 0.32, ataque: 0.05 });
    }

    return 2.25;
  },

  goteo(buffer, inicio) {
    const momentos = [0, 0.5, 1.05, 1.5];

    momentos.forEach((retardo, i) => {
      agregarNota(buffer, inicio + retardo, {
        frecuencia: 900 - i * 60,
        frecuenciaFinal: 320,
        duracion: 0.22,
        tipo: "sine",
        volumen: 0.7,
      });
    });

    return 1.95;
  },
};

/* -------------------------------------------------------------------------- */
/*  Render a WAV                                                              */
/* -------------------------------------------------------------------------- */

/** Duración de un ciclo del patrón, calculada llamándolo contra un buffer descartable. */
function duracionPatron(patron) {
  const sondeo = new Float64Array(1);
  return patron(sondeo, 0);
}

function renderizarPatron(patron) {
  const duracion = duracionPatron(patron);
  const buffer = new Float64Array(Math.ceil(duracion * FRECUENCIA_MUESTREO));
  patron(buffer, 0);
  return buffer;
}

/** WAV PCM de 16 bits, mono, sin dependencias — mismo espíritu que codificarPng en tools/lib/iconos.mjs. */
function codificarWav(muestras) {
  const cabecera = Buffer.alloc(44);
  const datos = Buffer.alloc(muestras.length * 2);

  for (let i = 0; i < muestras.length; i += 1) {
    // Recorte a [-1, 1]: varias notas simultáneas (campanas, radar…) pueden
    // sumar por encima del rango, igual que saturaría un altavoz real.
    const recortada = Math.max(-1, Math.min(1, muestras[i] * VOLUMEN_MAESTRO));
    datos.writeInt16LE(Math.round(recortada * 32767), i * 2);
  }

  const bytesPorMuestra = 2;
  const tasaBytes = FRECUENCIA_MUESTREO * bytesPorMuestra;

  cabecera.write("RIFF", 0, "ascii");
  cabecera.writeUInt32LE(36 + datos.length, 4);
  cabecera.write("WAVE", 8, "ascii");
  cabecera.write("fmt ", 12, "ascii");
  cabecera.writeUInt32LE(16, 16); // tamaño del bloque fmt
  cabecera.writeUInt16LE(1, 20); // PCM
  cabecera.writeUInt16LE(1, 22); // mono
  cabecera.writeUInt32LE(FRECUENCIA_MUESTREO, 24);
  cabecera.writeUInt32LE(tasaBytes, 28);
  cabecera.writeUInt16LE(bytesPorMuestra, 32);
  cabecera.writeUInt16LE(16, 34); // bits por muestra
  cabecera.write("data", 36, "ascii");
  cabecera.writeUInt32LE(datos.length, 40);

  return Buffer.concat([cabecera, datos]);
}

/* -------------------------------------------------------------------------- */

for (const [id, patron] of Object.entries(PATRONES)) {
  const muestras = renderizarPatron(patron);
  const wav = codificarWav(muestras);
  const destino = join(CARPETA_RAW, `tono_${id}.wav`);
  writeFileSync(destino, wav);
  console.log(`tono_${id}.wav — ${(muestras.length / FRECUENCIA_MUESTREO).toFixed(2)}s`);
}

console.log(`\n${Object.keys(PATRONES).length} tonos renderizados en ${CARPETA_RAW}`);
