/**
 * RadioAlarm · Sintetizador de tonos
 *
 * Genera los tonos con Web Audio en lugar de empaquetar archivos de audio: no
 * dependemos de bancos de sonido con licencia, no pesan nada, funcionan sin
 * conexión y la subida progresiva de volumen sale de serie.
 *
 * El `AudioContext` se crea la primera vez que se pide un tono, nunca al cargar
 * la página: los navegadores solo permiten arrancar audio a partir de un gesto
 * del usuario, y pulsar un tono lo es.
 *
 * Cada tono es un patrón que programa notas sobre la línea de tiempo del
 * contexto. Programar en lugar de encadenar temporizadores es lo que hace que
 * el ritmo salga exacto: Web Audio tiene su propio reloj, ajeno a los parones
 * de JavaScript.
 */

/** Volumen general de la síntesis. Los patrones se mueven entre 0 y 1. */
const VOLUMEN_MAESTRO = 0.28;

/** Volumen de arranque al sonar una alarma: no asustar al despertar. */
const VOLUMEN_INICIAL_ALARMA = 0.05;

/** Tono de respaldo si `sonarAlarmaTono` recibe un id que no existe. */
const TONO_RESPALDO = "clasico";

let contexto = null;
let maestro = null;

/** Osciladores en marcha, para poder cortarlos al pedir otro tono. */
let activos = [];

/** `setTimeout` que encadena el siguiente ciclo mientras la alarma suena. */
let temporizadorBucle = null;

/** @returns {boolean} `true` si el navegador puede sintetizar audio. */
export function audioDisponible() {
  return Boolean(window.AudioContext ?? window.webkitAudioContext);
}

function asegurarContexto() {
  if (!contexto) {
    const Constructor = window.AudioContext ?? window.webkitAudioContext;
    if (!Constructor) return null;

    contexto = new Constructor();
    maestro = contexto.createGain();
    maestro.gain.value = VOLUMEN_MAESTRO;
    maestro.connect(contexto.destination);
  }

  // Tras un rato sin uso el contexto se suspende; hay que despertarlo.
  if (contexto.state === "suspended") contexto.resume();

  return contexto;
}

/**
 * Programa una nota.
 *
 * La envolvente sube en línea recta y baja en exponencial, que es cómo decae un
 * sonido real. El descenso no puede llegar a cero exacto —`exponentialRamp` no
 * lo admite— así que se baja hasta un valor inaudible.
 */
function nota(
  inicio,
  {
    frecuencia,
    duracion,
    tipo = "sine",
    volumen = 1,
    ataque = 0.005,
    frecuenciaFinal = null,
  },
) {
  const oscilador = contexto.createOscillator();
  const ganancia = contexto.createGain();

  oscilador.type = tipo;
  oscilador.frequency.setValueAtTime(frecuencia, inicio);
  if (frecuenciaFinal !== null) {
    oscilador.frequency.linearRampToValueAtTime(frecuenciaFinal, inicio + duracion);
  }

  ganancia.gain.setValueAtTime(0.0001, inicio);
  ganancia.gain.linearRampToValueAtTime(volumen, inicio + ataque);
  ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);

  oscilador.connect(ganancia).connect(maestro);
  oscilador.start(inicio);
  oscilador.stop(inicio + duracion + 0.02);

  activos.push(oscilador);
}

/* -------------------------------------------------------------------------- */
/*  Patrones                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Un patrón por tono del catálogo. Recibe el instante de arranque y devuelve
 * cuánto dura el ciclo completo, en segundos.
 */
const PATRONES = {
  /** Trino mecánico de dos notas, como el martillo de un despertador de cuerda. */
  clasico(inicio) {
    const paso = 0.075;
    const golpes = 14;

    for (let i = 0; i < golpes; i += 1) {
      nota(inicio + i * paso, {
        frecuencia: i % 2 ? 720 : 960,
        duracion: paso * 0.95,
        tipo: "triangle",
        volumen: 0.85,
      });
    }

    return golpes * paso + 0.2;
  },

  /** Campanilleo ascendente que entra suave y va ganando cuerpo. */
  amanecer(inicio) {
    const notas = [523.25, 659.25, 783.99, 1046.5];

    notas.forEach((frecuencia, i) => {
      nota(inicio + i * 0.28, {
        frecuencia,
        duracion: 1,
        tipo: "sine",
        volumen: 0.3 + i * 0.16,
        ataque: 0.14,
      });
    });

    return notas.length * 0.28 + 0.9;
  },

  /** Pitido agudo y seco, repetido sin piedad. */
  digital(inicio) {
    const paso = 0.18;
    const pitidos = 6;

    for (let i = 0; i < pitidos; i += 1) {
      nota(inicio + i * paso, {
        frecuencia: 2093,
        duracion: 0.085,
        tipo: "square",
        volumen: 0.45,
      });
    }

    return pitidos * paso + 0.15;
  },

  /** Dos toques de campana: fundamental más armónicos con caídas distintas. */
  campanas(inicio) {
    for (const retardo of [0, 0.55]) {
      nota(inicio + retardo, {
        frecuencia: 659.25,
        duracion: 1.6,
        tipo: "sine",
        volumen: 0.85,
      });
      nota(inicio + retardo, {
        frecuencia: 987.77,
        duracion: 1.1,
        tipo: "sine",
        volumen: 0.35,
      });
      nota(inicio + retardo, {
        frecuencia: 1318.5,
        duracion: 0.65,
        tipo: "sine",
        volumen: 0.18,
      });
    }

    return 2.3;
  },

  /** Arpegio de madera: el armónico corto por encima da el golpe de baqueta. */
  marimba(inicio) {
    const notas = [523.25, 622.25, 783.99, 1046.5, 783.99];

    notas.forEach((frecuencia, i) => {
      nota(inicio + i * 0.14, {
        frecuencia,
        duracion: 0.45,
        tipo: "triangle",
        volumen: 0.75,
      });
      nota(inicio + i * 0.14, {
        frecuencia: frecuencia * 2,
        duracion: 0.16,
        tipo: "sine",
        volumen: 0.2,
      });
    });

    return notas.length * 0.14 + 0.45;
  },

  /** Pulso doble cuyo hueco se va acortando: mete prisa. */
  radar(inicio) {
    let momento = inicio;
    let hueco = 0.44;

    for (let i = 0; i < 5; i += 1) {
      nota(momento, { frecuencia: 1200, duracion: 0.07, volumen: 0.75 });
      nota(momento + 0.11, { frecuencia: 1200, duracion: 0.07, volumen: 0.55 });

      momento += hueco;
      hueco = Math.max(0.17, hueco * 0.78);
    }

    return momento - inicio + 0.2;
  },

  /** Tono grave con dos ecos cada vez más flojos. */
  sonar(inicio) {
    for (const [retardo, volumen] of [
      [0, 0.9],
      [0.75, 0.4],
      [1.4, 0.16],
    ]) {
      nota(inicio + retardo, {
        frecuencia: 233.08,
        duracion: 1.5,
        tipo: "sine",
        volumen,
        ataque: 0.02,
      });
    }

    return 2.6;
  },

  /** Barrido continuo arriba y abajo, dos ciclos. */
  sirena(inicio) {
    for (let i = 0; i < 2; i += 1) {
      const momento = inicio + i * 1.1;

      nota(momento, {
        frecuencia: 520,
        frecuenciaFinal: 1040,
        duracion: 0.55,
        tipo: "sawtooth",
        volumen: 0.32,
        ataque: 0.05,
      });
      nota(momento + 0.55, {
        frecuencia: 1040,
        frecuenciaFinal: 520,
        duracion: 0.55,
        tipo: "sawtooth",
        volumen: 0.32,
        ataque: 0.05,
      });
    }

    return 2.25;
  },

  /** Gotas: la caída rápida de tono es lo que las hace sonar a agua. */
  goteo(inicio) {
    const momentos = [0, 0.5, 1.05, 1.5];

    momentos.forEach((retardo, i) => {
      nota(inicio + retardo, {
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
/*  API                                                                       */
/* -------------------------------------------------------------------------- */

/** Corta en seco lo que esté sonando. */
export function pararTono() {
  for (const oscilador of activos) {
    try {
      oscilador.stop();
    } catch {
      // Ya había terminado por su cuenta: no hay nada que cortar.
    }
  }

  activos = [];
}

/**
 * Reproduce un tono del catálogo una vez.
 *
 * Corta antes lo que estuviera sonando, para que pulsar varios tonos seguidos no
 * los solape.
 *
 * @param {string} id Identificador del tono.
 * @returns {number} Duración en segundos, o 0 si no se pudo reproducir.
 */
export function reproducirTono(id) {
  const patron = PATRONES[id];
  if (!patron || !asegurarContexto()) return 0;

  pararTono();

  // Un margen mínimo evita el chasquido de arrancar justo en el instante actual.
  return patron(contexto.currentTime + 0.02);
}

/** Ids de los tonos que el sintetizador sabe generar. */
export function tonosSintetizables() {
  return Object.keys(PATRONES);
}

/**
 * Crea o despierta el `AudioContext` sin reproducir nada. Se llama en el
 * primer gesto del usuario (`js/audio/desbloqueo.js`) para que el navegador
 * ya lo dé por desbloqueado cuando, más adelante, una alarma tenga que sonar
 * sin que nadie haya tocado nada justo antes.
 */
export function asegurarContextoDesbloqueado() {
  asegurarContexto();
}

/**
 * Hace sonar un tono como alarma: en bucle y con el volumen subiendo poco a
 * poco. A diferencia de `reproducirTono`, no se detiene solo —hay que llamar
 * a `pararAlarmaTono()`—.
 *
 * Encadena cada ciclo con el anterior mediante `setTimeout`: no es tan preciso
 * como programar todo por adelantado en la línea de tiempo de Web Audio, pero
 * para un tono que repite hasta que alguien lo pare la diferencia no se nota,
 * y así cada ciclo puede volver a calcular su propia duración.
 *
 * @param {string} id
 * @param {{rampaMs?: number}} [opciones]
 * @returns {boolean} `true` si ha podido arrancar.
 */
export function sonarAlarmaTono(id, { rampaMs = 20000 } = {}) {
  const patron = PATRONES[id] ?? PATRONES[TONO_RESPALDO];
  if (!patron || !asegurarContexto()) return false;

  pararAlarmaTono();
  pararTono(); // por si quedaba una muestra de prueba sonando

  const ahora = contexto.currentTime;
  maestro.gain.cancelScheduledValues(ahora);
  maestro.gain.setValueAtTime(VOLUMEN_INICIAL_ALARMA, ahora);
  maestro.gain.linearRampToValueAtTime(VOLUMEN_MAESTRO, ahora + rampaMs / 1000);

  const ciclo = () => {
    const duracion = patron(contexto.currentTime + 0.02);
    temporizadorBucle = setTimeout(ciclo, duracion * 1000);
  };
  ciclo();

  return true;
}

/** Para el tono de alarma y devuelve el volumen general a su valor de siempre. */
export function pararAlarmaTono() {
  clearTimeout(temporizadorBucle);
  temporizadorBucle = null;
  pararTono();

  if (contexto) {
    maestro.gain.cancelScheduledValues(contexto.currentTime);
    maestro.gain.setValueAtTime(VOLUMEN_MAESTRO, contexto.currentTime);
  }
}
