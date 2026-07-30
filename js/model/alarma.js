/**
 * RadioAlarm · Modelo de alarma
 *
 * Lógica pura: no toca el DOM ni el almacenamiento, así que se puede probar
 * fuera del navegador (`node tests/modelo.test.mjs`).
 *
 * Aquí vive el esquema de una alarma, su saneado y —lo más delicado— el cálculo
 * del próximo disparo con repetición semanal.
 */

import { TONO_POR_DEFECTO, existeTono } from "../datos/tonos.js";

/* -------------------------------------------------------------------------- */
/*  Constantes del esquema                                                    */
/* -------------------------------------------------------------------------- */

export const REPETICION = {
  UNA_VEZ: "una-vez",
  PERSONALIZADA: "personalizada",
};

export const FUENTE = {
  TONO: "tono",
  CANCION: "cancion",
  RADIO: "radio",
};

/**
 * Días de la semana en el orden en que se muestran en España (lunes primero).
 * El `id` es el que devuelve `Date.getDay()` (0 = domingo), para no tener que
 * convertir nada al calcular el próximo disparo.
 */
export const DIAS_SEMANA = [
  { id: 1, corto: "L", nombre: "Lunes" },
  { id: 2, corto: "M", nombre: "Martes" },
  { id: 3, corto: "X", nombre: "Miércoles" },
  { id: 4, corto: "J", nombre: "Jueves" },
  { id: 5, corto: "V", nombre: "Viernes" },
  { id: 6, corto: "S", nombre: "Sábado" },
  { id: 0, corto: "D", nombre: "Domingo" },
];

const DIAS_LABORABLES = [1, 2, 3, 4, 5];
const DIAS_FIN_SEMANA = [0, 6];

export const HORA_POR_DEFECTO = "07:00";
export const NOMBRE_POR_DEFECTO = "Alarma";
export const NOMBRE_LARGO_MAX = 60;

/** Límites del pospuesto. `veces: 0` significa «no se puede posponer». */
export const POSPONER = {
  VECES_MIN: 0,
  VECES_MAX: 10,
  MINUTOS_MIN: 1,
  MINUTOS_MAX: 60,
  POR_DEFECTO: { veces: 3, minutos: 5 },
};

/* -------------------------------------------------------------------------- */
/*  Utilidades de hora                                                        */
/* -------------------------------------------------------------------------- */

const PATRON_HORA = /^(\d{1,2}):(\d{1,2})$/;

/** Comprueba que un texto es una hora del día válida en formato `H:M`. */
export function esHoraValida(texto) {
  const partes = partirHora(texto);
  return partes !== null;
}

/** Devuelve `[horas, minutos]`, o `null` si el texto no es una hora válida. */
export function partirHora(texto) {
  if (typeof texto !== "string") return null;

  const coincidencia = PATRON_HORA.exec(texto.trim());
  if (!coincidencia) return null;

  const horas = Number(coincidencia[1]);
  const minutos = Number(coincidencia[2]);
  if (horas > 23 || minutos > 59) return null;

  return [horas, minutos];
}

/** Normaliza una hora a `HH:MM` con ceros por delante. */
export function normalizarHora(texto) {
  const partes = partirHora(texto);
  if (!partes) return HORA_POR_DEFECTO;

  const [horas, minutos] = partes;
  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

/* -------------------------------------------------------------------------- */
/*  Saneado                                                                   */
/* -------------------------------------------------------------------------- */

function nuevoId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // Respaldo para contextos sin `crypto`: suficiente para claves locales.
  return `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function enteroEntre(valor, minimo, maximo, porDefecto) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return porDefecto;
  return Math.min(maximo, Math.max(minimo, Math.round(numero)));
}

function sanearNombre(valor) {
  if (typeof valor !== "string") return NOMBRE_POR_DEFECTO;

  const limpio = valor.trim().slice(0, NOMBRE_LARGO_MAX);
  return limpio || NOMBRE_POR_DEFECTO;
}

/**
 * Días válidos, sin repetidos y ordenados.
 *
 * Se filtra por tipo ANTES de convertir a número: `Number(null)`, `Number("")`
 * y `Number(false)` valen 0, que es un día válido (domingo). Sin este filtro,
 * un dato corrupto activaría el domingo por su cuenta.
 */
function sanearDias(valor) {
  if (!Array.isArray(valor)) return [];

  const validos = valor
    .filter(
      (dia) =>
        typeof dia === "number" || (typeof dia === "string" && dia.trim() !== ""),
    )
    .map(Number)
    .filter((dia) => Number.isInteger(dia) && dia >= 0 && dia <= 6);

  return [...new Set(validos)].sort((a, b) => a - b);
}

/** Recurso con nombre (canción) o con nombre y URL (emisora). */
function sanearRecurso(valor, conUrl = false) {
  if (!valor || typeof valor !== "object") return null;

  const nombre = typeof valor.nombre === "string" ? valor.nombre.trim() : "";
  if (!nombre) return null;

  if (!conUrl) {
    // Una canción necesita el id con el que se guardó su audio en IndexedDB
    // (js/store/audioBlobs.js); sin él no hay forma de recuperar el archivo.
    const id = typeof valor.id === "string" ? valor.id.trim() : "";
    return id ? { nombre, id } : null;
  }

  const url = typeof valor.url === "string" ? valor.url.trim() : "";
  return url ? { nombre, url } : null;
}

/**
 * Sanea la fuente de sonido.
 *
 * Se conservan las tres opciones a la vez para que cambiar de tipo no borre lo
 * demás. Y si el tipo elegido apunta a algo que no está configurado —canción
 * sin archivo, radio sin emisora— se cae al tono: una alarma siempre tiene que
 * poder sonar.
 */
function sanearSonido(valor) {
  const bruto = valor && typeof valor === "object" ? valor : {};

  const cancion = sanearRecurso(bruto.cancion);
  const emisora = sanearRecurso(bruto.emisora, true);

  let tipo = Object.values(FUENTE).includes(bruto.tipo) ? bruto.tipo : FUENTE.TONO;
  if (tipo === FUENTE.CANCION && !cancion) tipo = FUENTE.TONO;
  if (tipo === FUENTE.RADIO && !emisora) tipo = FUENTE.TONO;

  return {
    tipo,
    tono: existeTono(bruto.tono) ? bruto.tono : TONO_POR_DEFECTO,
    cancion,
    emisora,
  };
}

function sanearPosponer(valor) {
  const bruto = valor && typeof valor === "object" ? valor : {};

  return {
    veces: enteroEntre(
      bruto.veces,
      POSPONER.VECES_MIN,
      POSPONER.VECES_MAX,
      POSPONER.POR_DEFECTO.veces,
    ),
    minutos: enteroEntre(
      bruto.minutos,
      POSPONER.MINUTOS_MIN,
      POSPONER.MINUTOS_MAX,
      POSPONER.POR_DEFECTO.minutos,
    ),
  };
}

function sanearFecha(valor) {
  if (typeof valor !== "string") return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

/**
 * Convierte cualquier objeto en una alarma válida.
 *
 * Se usa tanto al crear desde el editor como al leer del almacenamiento, donde
 * el dato puede venir de una versión anterior de la app o manipulado a mano. No
 * lanza nunca: lo que no se entiende se sustituye por el valor por defecto.
 *
 * Las marcas de tiempo se preservan tal cual; es `guardarAlarma` quien
 * actualiza `modificada`.
 */
export function normalizarAlarma(bruto = {}) {
  const origen = bruto && typeof bruto === "object" ? bruto : {};

  const repeticion = Object.values(REPETICION).includes(origen.repeticion)
    ? origen.repeticion
    : REPETICION.UNA_VEZ;

  const creada = sanearFecha(origen.creada) ?? new Date().toISOString();

  return {
    id: typeof origen.id === "string" && origen.id.trim() ? origen.id.trim() : nuevoId(),
    nombre: sanearNombre(origen.nombre),
    hora: normalizarHora(origen.hora),
    repeticion,
    // Los días solo tienen sentido en la repetición personalizada.
    dias: repeticion === REPETICION.PERSONALIZADA ? sanearDias(origen.dias) : [],
    sonido: sanearSonido(origen.sonido),
    vibracion: origen.vibracion !== false,
    posponer: sanearPosponer(origen.posponer),
    activa: origen.activa !== false,
    creada,
    modificada: sanearFecha(origen.modificada) ?? creada,
  };
}

/** Crea una alarma nueva con los valores por defecto. */
export function crearAlarma(datos = {}) {
  return normalizarAlarma({ ...datos, id: undefined });
}

/* -------------------------------------------------------------------------- */
/*  Próximo disparo                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Momento en que sonará la alarma por próxima vez.
 *
 * Devuelve `null` si la alarma está desactivada o si es personalizada y no tiene
 * ningún día marcado (en ese caso no puede sonar nunca).
 *
 * El resultado es siempre **estrictamente futuro**: si la hora de hoy ya ha
 * pasado, salta al siguiente día que toque. Las alarmas que se hayan quedado
 * atrás por tener el equipo suspendido las recupera el motor de la Fase 6, que
 * es quien sabe qué se ha disparado ya y qué no.
 *
 * Las fechas se construyen fijando la hora del reloj de pared después de mover
 * el día, así que los cambios de horario de verano se respetan solos: una alarma
 * a las 07:00 sigue sonando a las 07:00.
 *
 * @param {object} alarma
 * @param {Date} [desde] Instante de referencia; por defecto, ahora.
 * @returns {Date|null}
 */
export function proximoDisparo(alarma, desde = new Date()) {
  if (!alarma?.activa) return null;

  const partes = partirHora(alarma.hora);
  if (!partes) return null;

  const [horas, minutos] = partes;

  const candidato = (diasDespues) => {
    const fecha = new Date(desde.getTime());
    fecha.setDate(fecha.getDate() + diasDespues);
    fecha.setHours(horas, minutos, 0, 0);
    return fecha;
  };

  if (alarma.repeticion === REPETICION.UNA_VEZ) {
    const hoy = candidato(0);
    return hoy.getTime() > desde.getTime() ? hoy : candidato(1);
  }

  if (!alarma.dias?.length) return null;

  // Se recorre hasta 7 días inclusive: si el único día marcado es hoy y la hora
  // ya pasó, el octavo intento (i = 7) cae en el mismo día de la semana que
  // viene.
  for (let i = 0; i <= 7; i += 1) {
    const fecha = candidato(i);
    if (alarma.dias.includes(fecha.getDay()) && fecha.getTime() > desde.getTime()) {
      return fecha;
    }
  }

  return null;
}

/**
 * Qué alarmas deben sonar entre dos instantes: `(desde, hasta]`, ambos
 * incluidos salvo `desde`.
 *
 * Es el corazón del motor de disparo (Fase 6). Se usa `(desde, hasta]` en vez
 * de comprobar solo «ahora» para no perder una alarma si el temporizador se
 * retrasa —pestaña en segundo plano, equipo suspendido—: `desde` es la última
 * vez que se comprobó, así que cualquier disparo ocurrido mientras tanto se
 * detecta igual, aunque haya pasado ya el momento exacto.
 *
 * Solo puede devolver **una** alarma por cada elemento de `alarmas`, nunca dos
 * ocurrencias de la misma: `proximoDisparo` solo calcula la siguiente, así que
 * un hueco larguísimo (equipo suspendido varios días) no hace sonar de golpe
 * todos los disparos que hubo mientras tanto, solo el más próximo a `desde`.
 *
 * @param {object[]} alarmas
 * @param {Date} desde Última comprobación.
 * @param {Date} hasta Comprobación actual; normalmente `new Date()`.
 * @returns {{alarma: object, cuando: Date}[]} Ordenado por `cuando`.
 */
export function alarmasQueDebenSonar(alarmas, desde, hasta) {
  const debidas = [];

  for (const alarma of alarmas) {
    const cuando = proximoDisparo(alarma, desde);
    if (cuando && cuando.getTime() <= hasta.getTime()) {
      debidas.push({ alarma, cuando });
    }
  }

  return debidas.sort((a, b) => a.cuando.getTime() - b.cuando.getTime());
}

/* -------------------------------------------------------------------------- */
/*  Textos para la interfaz                                                   */
/* -------------------------------------------------------------------------- */

function mismosDias(dias, referencia) {
  return dias.length === referencia.length && referencia.every((dia) => dias.includes(dia));
}

/** Resumen corto de la repetición: «Una vez», «De lunes a viernes», «L, X, V»… */
export function resumenRepeticion(alarma) {
  if (alarma?.repeticion !== REPETICION.PERSONALIZADA) return "Una vez";

  const dias = alarma.dias ?? [];
  if (!dias.length) return "Ningún día";
  if (dias.length === 7) return "Todos los días";
  if (mismosDias(dias, DIAS_LABORABLES)) return "De lunes a viernes";
  if (mismosDias(dias, DIAS_FIN_SEMANA)) return "Fines de semana";

  return DIAS_SEMANA.filter((dia) => dias.includes(dia.id))
    .map((dia) => dia.corto)
    .join(", ");
}

/** Cuánto falta para una fecha, en lenguaje llano: «en 7 h 30 min». */
export function tiempoHasta(fecha, desde = new Date()) {
  if (!(fecha instanceof Date)) return "";

  const minutosTotales = Math.round((fecha.getTime() - desde.getTime()) / 60000);
  if (minutosTotales <= 0) return "ahora";
  if (minutosTotales < 60) return `en ${minutosTotales} min`;

  const horasTotales = Math.floor(minutosTotales / 60);
  const minutos = minutosTotales % 60;

  if (horasTotales < 24) {
    return minutos ? `en ${horasTotales} h ${minutos} min` : `en ${horasTotales} h`;
  }

  const dias = Math.floor(horasTotales / 24);
  const horas = horasTotales % 24;
  const textoDias = dias === 1 ? "1 día" : `${dias} días`;

  return horas ? `en ${textoDias} y ${horas} h` : `en ${textoDias}`;
}

/** Ordena para el listado: por hora y, a igual hora, por nombre. */
export function ordenarAlarmas(alarmas) {
  return [...alarmas].sort(
    (a, b) => a.hora.localeCompare(b.hora) || a.nombre.localeCompare(b.nombre, "es"),
  );
}
