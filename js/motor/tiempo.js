/**
 * RadioAlarm · Cronómetro y cuenta atrás
 *
 * Lógica pura: nada de `setInterval` ni de leer `Date.now()` por su cuenta.
 * Cada función que necesita "el instante actual" lo recibe como parámetro
 * `ahora`, así que se puede probar fuera del navegador pasando marcas de
 * tiempo fijas (`node tests/motor.test.mjs`) en vez de esperar de verdad.
 *
 * Quien la usa (`js/ui/crono.js`, `js/ui/cuentaAtras.js`) es responsable de
 * llamar a estas funciones desde un temporizador real y de pintar el
 * resultado; aquí no hay DOM ni almacenamiento.
 */

/* -------------------------------------------------------------------------- */
/*  Formato                                                                   */
/* -------------------------------------------------------------------------- */

function dosDigitos(numero) {
  return String(numero).padStart(2, "0");
}

/** "MM:SS", o "H:MM:SS" si pasa de una hora. Para la cuenta atrás. */
export function formatoReloj(ms) {
  const totalSegundos = Math.max(0, Math.round(ms / 1000));
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;

  return horas > 0
    ? `${horas}:${dosDigitos(minutos)}:${dosDigitos(segundos)}`
    : `${dosDigitos(minutos)}:${dosDigitos(segundos)}`;
}

/** "MM:SS.cc" con centésimas, o "H:MM:SS.cc" si pasa de una hora. Para el cronómetro. */
export function formatoCronometro(ms) {
  const totalCentesimas = Math.max(0, Math.round(ms / 10));
  const centesimas = totalCentesimas % 100;
  const totalSegundos = Math.floor(totalCentesimas / 100);
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;

  const resto = `${dosDigitos(segundos)}.${dosDigitos(centesimas)}`;
  return horas > 0
    ? `${horas}:${dosDigitos(minutos)}:${resto}`
    : `${dosDigitos(minutos)}:${resto}`;
}

/* -------------------------------------------------------------------------- */
/*  Cronómetro                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Cuenta hacia arriba desde que se inicia hasta que se para o se reinicia.
 * Pausar y reanudar no pierde lo acumulado.
 */
export function crearCronometro() {
  let acumuladoMs = 0;
  let inicioTramo = null;
  let corriendo = false;

  function iniciar(ahora = Date.now()) {
    if (corriendo) return;
    inicioTramo = ahora;
    corriendo = true;
  }

  function pausar(ahora = Date.now()) {
    if (!corriendo) return;
    acumuladoMs += ahora - inicioTramo;
    inicioTramo = null;
    corriendo = false;
  }

  function reiniciar() {
    acumuladoMs = 0;
    inicioTramo = null;
    corriendo = false;
  }

  function transcurridoMs(ahora = Date.now()) {
    return acumuladoMs + (corriendo ? ahora - inicioTramo : 0);
  }

  function estaCorriendo() {
    return corriendo;
  }

  return { iniciar, pausar, reiniciar, transcurridoMs, estaCorriendo };
}

/* -------------------------------------------------------------------------- */
/*  Cuenta atrás                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Cuenta hacia abajo desde una duración fijada hasta llegar a cero.
 *
 * `comprobar(ahora)` es la pieza pensada para llamarse en cada tick de un
 * `setInterval`: solo devuelve `true` la primera vez que detecta que ha
 * llegado a cero corriendo, para que quien la use dispare el aviso de fin una
 * sola vez y no en cada tick posterior.
 */
export function crearCuentaAtras() {
  let duracionMs = 0;
  let restanteMs = 0;
  let inicioTramo = null;
  let corriendo = false;
  let terminado = false;

  /** Fija la duración de partida y deja la cuenta atrás lista para iniciarse. */
  function establecerDuracion(ms) {
    duracionMs = Math.max(0, ms);
    restanteMs = duracionMs;
    inicioTramo = null;
    corriendo = false;
    terminado = false;
  }

  function iniciar(ahora = Date.now()) {
    if (corriendo || terminado || restanteMs <= 0) return;
    inicioTramo = ahora;
    corriendo = true;
  }

  function pausar(ahora = Date.now()) {
    if (!corriendo) return;
    restanteMs = Math.max(0, restanteMs - (ahora - inicioTramo));
    inicioTramo = null;
    corriendo = false;
  }

  /** Vuelve a la duración de partida, tanto si había terminado como si no. */
  function reiniciar() {
    restanteMs = duracionMs;
    inicioTramo = null;
    corriendo = false;
    terminado = false;
  }

  function tiempoRestanteMs(ahora = Date.now()) {
    if (!corriendo) return restanteMs;
    return Math.max(0, restanteMs - (ahora - inicioTramo));
  }

  function comprobar(ahora = Date.now()) {
    if (!corriendo || tiempoRestanteMs(ahora) > 0) return false;

    restanteMs = 0;
    inicioTramo = null;
    corriendo = false;
    terminado = true;
    return true;
  }

  function estaCorriendo() {
    return corriendo;
  }

  function haTerminado() {
    return terminado;
  }

  function duracion() {
    return duracionMs;
  }

  return {
    establecerDuracion,
    iniciar,
    pausar,
    reiniciar,
    tiempoRestanteMs,
    comprobar,
    estaCorriendo,
    haTerminado,
    duracion,
  };
}
