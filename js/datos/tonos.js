/**
 * RadioAlarm · Catálogo de tonos
 *
 * Datos puros, sin interfaz ni almacenamiento: los usan tanto la vista de
 * opciones de sonido como el modelo de alarmas, así que viven aparte para que
 * ninguno de los dos dependa del otro.
 *
 * Cada tono se genera por síntesis con Web Audio (`js/audio/sintetizador.js`)
 * en lugar de empaquetar archivos de audio: no dependemos de bancos de sonido
 * con licencia, no pesan nada, funcionan sin conexión y la subida progresiva
 * de volumen sale de serie. Los sonidos de alarma clásicos son ondas simples,
 * así que se reproducen bien sintetizados.
 *
 * Los tonos de fábrica del móvil NO se pueden leer desde la web: viven en una
 * carpeta protegida del sistema y solo `RingtoneManager` (nativo) los expone.
 * La Fase 10, con el envoltorio Android, añadirá la lista completa del sistema.
 */

export const TONOS = [
  {
    id: "clasico",
    nombre: "Clásico",
    descripcion: "Timbre de despertador de cuerda, trino de dos notas",
  },
  {
    id: "amanecer",
    nombre: "Amanecer",
    descripcion: "Campanilleo suave que sube de volumen poco a poco",
  },
  {
    id: "digital",
    nombre: "Digital",
    descripcion: "Pitido agudo y repetitivo, imposible de ignorar",
  },
  {
    id: "campanas",
    nombre: "Campanas",
    descripcion: "Repique corto y cálido",
  },
  {
    id: "marimba",
    nombre: "Marimba",
    descripcion: "Arpegio de madera, notas ascendentes",
  },
  {
    id: "radar",
    nombre: "Radar",
    descripcion: "Pulso doble que se va acelerando",
  },
  {
    id: "sonar",
    nombre: "Sónar",
    descripcion: "Tono profundo con eco largo",
  },
  {
    id: "sirena",
    nombre: "Sirena",
    descripcion: "Barrido que sube y baja sin parar",
  },
  {
    id: "goteo",
    nombre: "Goteo",
    descripcion: "Pulsos cortos y espaciados, para despertar sin sobresalto",
  },
];

/** Tono preseleccionado mientras el usuario no elija otro. */
export const TONO_POR_DEFECTO = "clasico";

export function existeTono(id) {
  return TONOS.some((tono) => tono.id === id);
}

/** Nombre legible de un tono; devuelve el propio id si no está en el catálogo. */
export function nombreTono(id) {
  return TONOS.find((tono) => tono.id === id)?.nombre ?? id;
}
