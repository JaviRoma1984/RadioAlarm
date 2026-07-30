/**
 * RadioAlarm · Pruebas del modelo de alarmas
 *
 * Se ejecutan sin navegador y sin dependencias:
 *
 *     npm test
 *
 * `js/model/alarma.js` es lógica pura, así que se prueba tal cual.
 * `js/model/alarmas.js` necesita almacenamiento, así que se le pone un
 * `localStorage` de mentira antes de importarlo.
 */

import { crearArnes } from "./arnes.mjs";

const { grupo, prueba, igual, cierto, resumen } = crearArnes();

/* -------------------------------------------------------------------------- */
/*  localStorage de mentira, antes de importar nada que lo use                */
/* -------------------------------------------------------------------------- */

globalThis.localStorage = (() => {
  const datos = new Map();
  return {
    getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
    setItem: (clave, valor) => datos.set(clave, String(valor)),
    removeItem: (clave) => datos.delete(clave),
    clear: () => datos.clear(),
  };
})();

const {
  DIAS_SEMANA,
  FUENTE,
  POSPONER,
  REPETICION,
  alarmasQueDebenSonar,
  crearAlarma,
  esHoraValida,
  normalizarAlarma,
  normalizarHora,
  ordenarAlarmas,
  proximoDisparo,
  resumenRepeticion,
  tiempoHasta,
} = await import("../js/model/alarma.js");

const {
  alCambiar,
  alternarActiva,
  borrarAlarma,
  borrarTodas,
  contarAlarmas,
  guardarAlarma,
  listarAlarmas,
  marcarComoSonada,
  obtenerAlarma,
  proximaAlarma,
} = await import("../js/model/alarmas.js");

const { TONOS, TONO_POR_DEFECTO, existeTono, nombreTono } = await import(
  "../js/datos/tonos.js"
);

// El sintetizador solo toca `window` dentro de sus funciones, así que se puede
// importar en Node para comprobar la correspondencia con el catálogo.
const { tonosSintetizables } = await import("../js/audio/sintetizador.js");

/* -------------------------------------------------------------------------- */
/*  Catálogo de tonos                                                         */
/* -------------------------------------------------------------------------- */

grupo("Catálogo de tonos");

prueba("todos los tonos del catálogo tienen sonido", () => {
  const conSonido = tonosSintetizables();
  const mudos = TONOS.filter((tono) => !conSonido.includes(tono.id)).map((t) => t.id);

  igual(mudos, [], "estos tonos se pueden elegir pero no suenan");
});

prueba("no hay sonidos huérfanos sin entrada en el catálogo", () => {
  const huerfanos = tonosSintetizables().filter((id) => !existeTono(id));

  igual(huerfanos, [], "estos sonidos existen pero no se pueden elegir");
});

prueba("el tono por defecto está en el catálogo", () => {
  cierto(existeTono(TONO_POR_DEFECTO));
  igual(nombreTono(TONO_POR_DEFECTO), "Clásico");
});

prueba("los ids del catálogo no se repiten", () => {
  const ids = TONOS.map((tono) => tono.id);
  igual(ids.length, new Set(ids).size);
});

/* -------------------------------------------------------------------------- */
/*  Horas                                                                     */
/* -------------------------------------------------------------------------- */

grupo("Horas");

prueba("acepta horas válidas", () => {
  cierto(esHoraValida("00:00"));
  cierto(esHoraValida("23:59"));
  cierto(esHoraValida("7:5"));
});

prueba("rechaza horas imposibles y basura", () => {
  cierto(!esHoraValida("24:00"), "24:00 no existe");
  cierto(!esHoraValida("07:60"), "07:60 no existe");
  cierto(!esHoraValida("siete"));
  cierto(!esHoraValida(""));
  cierto(!esHoraValida(null));
  cierto(!esHoraValida("07:00:00"));
});

prueba("rellena con ceros por delante", () => {
  igual(normalizarHora("7:5"), "07:05");
  igual(normalizarHora(" 9:30 "), "09:30");
});

prueba("una hora inválida cae en la de por defecto", () => {
  igual(normalizarHora("99:99"), "07:00");
});

/* -------------------------------------------------------------------------- */
/*  Saneado                                                                   */
/* -------------------------------------------------------------------------- */

grupo("Saneado de la alarma");

prueba("una alarma nueva trae los valores por defecto", () => {
  const alarma = crearAlarma();

  igual(alarma.nombre, "Alarma");
  igual(alarma.hora, "07:00");
  igual(alarma.repeticion, REPETICION.UNA_VEZ);
  igual(alarma.dias, []);
  igual(alarma.sonido.tipo, FUENTE.TONO);
  igual(alarma.sonido.tono, "clasico");
  igual(alarma.vibracion, true);
  igual(alarma.posponer, POSPONER.POR_DEFECTO);
  igual(alarma.activa, true);
  cierto(alarma.id.length > 0, "debe generar un id");
});

prueba("dos alarmas nuevas no comparten id", () => {
  cierto(crearAlarma().id !== crearAlarma().id);
});

prueba("sustituye lo que no entiende por el valor por defecto", () => {
  const alarma = normalizarAlarma({
    nombre: "   ",
    hora: "25:00",
    repeticion: "loquesea",
    posponer: { veces: 99, minutos: 0 },
  });

  igual(alarma.nombre, "Alarma");
  igual(alarma.hora, "07:00");
  igual(alarma.repeticion, REPETICION.UNA_VEZ);
  igual(alarma.posponer, { veces: POSPONER.VECES_MAX, minutos: POSPONER.MINUTOS_MIN });
});

prueba("respeta lo que sí es válido", () => {
  const alarma = normalizarAlarma({
    nombre: "  Trabajo  ",
    hora: "6:45",
    vibracion: false,
    activa: false,
    posponer: { veces: 0, minutos: 10 },
  });

  igual(alarma.nombre, "Trabajo");
  igual(alarma.hora, "06:45");
  igual(alarma.vibracion, false);
  igual(alarma.activa, false);
  igual(alarma.posponer, { veces: 0, minutos: 10 });
});

prueba("recorta los nombres larguísimos", () => {
  igual(normalizarAlarma({ nombre: "a".repeat(200) }).nombre.length, 60);
});

prueba("limpia los días: sin repetidos, sin inválidos y ordenados", () => {
  const alarma = normalizarAlarma({
    repeticion: REPETICION.PERSONALIZADA,
    dias: [3, 1, 1, 7, -2, "5", null],
  });

  igual(alarma.dias, [1, 3, 5]);
});

prueba("los valores que se convierten en 0 no activan el domingo", () => {
  // `Number(null)`, `Number("")` y `Number(false)` valen 0, que es domingo.
  const alarma = normalizarAlarma({
    repeticion: REPETICION.PERSONALIZADA,
    dias: [null, undefined, "", false, [], {}],
  });

  igual(alarma.dias, []);
});

prueba("el domingo de verdad sí se guarda", () => {
  igual(
    normalizarAlarma({ repeticion: REPETICION.PERSONALIZADA, dias: [0] }).dias,
    [0],
  );
});

prueba("una alarma de una vez no guarda días", () => {
  const alarma = normalizarAlarma({ repeticion: REPETICION.UNA_VEZ, dias: [1, 2, 3] });
  igual(alarma.dias, []);
});

/* -------------------------------------------------------------------------- */
/*  Fuente de sonido                                                          */
/* -------------------------------------------------------------------------- */

grupo("Fuente de sonido");

prueba("un tono que no existe cae en el de por defecto", () => {
  igual(normalizarAlarma({ sonido: { tono: "inventado" } }).sonido.tono, "clasico");
});

prueba("canción sin archivo cae en el tono", () => {
  const sonido = normalizarAlarma({ sonido: { tipo: FUENTE.CANCION } }).sonido;

  igual(sonido.tipo, FUENTE.TONO);
  igual(sonido.cancion, null);
});

prueba("canción con nombre pero sin id cae en el tono", () => {
  // Sin id no hay forma de recuperar el audio de IndexedDB: es lo mismo que
  // no tener canción.
  const sonido = normalizarAlarma({
    sonido: { tipo: FUENTE.CANCION, cancion: { nombre: "trabajo.mp3" } },
  }).sonido;

  igual(sonido.tipo, FUENTE.TONO);
  igual(sonido.cancion, null);
});

prueba("canción completa se conserva", () => {
  const sonido = normalizarAlarma({
    sonido: { tipo: FUENTE.CANCION, cancion: { nombre: "trabajo.mp3", id: "abc123" } },
  }).sonido;

  igual(sonido.tipo, FUENTE.CANCION);
  igual(sonido.cancion, { nombre: "trabajo.mp3", id: "abc123" });
});

prueba("emisora sin URL cae en el tono", () => {
  const sonido = normalizarAlarma({
    sonido: { tipo: FUENTE.RADIO, emisora: { nombre: "Radio 3" } },
  }).sonido;

  igual(sonido.tipo, FUENTE.TONO);
  igual(sonido.emisora, null);
});

prueba("emisora completa se conserva", () => {
  const sonido = normalizarAlarma({
    sonido: { tipo: FUENTE.RADIO, emisora: { nombre: "Radio 3", url: "https://x/y.mp3" } },
  }).sonido;

  igual(sonido.tipo, FUENTE.RADIO);
  igual(sonido.emisora, { nombre: "Radio 3", url: "https://x/y.mp3" });
});

prueba("cambiar de tipo no borra las otras fuentes", () => {
  const sonido = normalizarAlarma({
    sonido: {
      tipo: FUENTE.TONO,
      tono: "marimba",
      cancion: { nombre: "cancion.mp3", id: "abc123" },
      emisora: { nombre: "Radio 3", url: "https://x/y.mp3" },
    },
  }).sonido;

  igual(sonido.tono, "marimba");
  igual(sonido.cancion, { nombre: "cancion.mp3", id: "abc123" });
  igual(sonido.emisora.nombre, "Radio 3");
});

/* -------------------------------------------------------------------------- */
/*  Próximo disparo                                                           */
/* -------------------------------------------------------------------------- */

grupo("Próximo disparo");

prueba("una vez, con la hora todavía por llegar: hoy", () => {
  const desde = new Date(2026, 2, 10, 6, 0, 0);
  const cuando = proximoDisparo(normalizarAlarma({ hora: "07:00" }), desde);

  igual(cuando.getDate(), desde.getDate());
  igual([cuando.getHours(), cuando.getMinutes()], [7, 0]);
});

prueba("una vez, con la hora ya pasada: mañana", () => {
  const desde = new Date(2026, 2, 10, 8, 0, 0);
  const cuando = proximoDisparo(normalizarAlarma({ hora: "07:00" }), desde);

  igual(Math.round((cuando - desde) / 3600000), 23, "faltan 23 h");
  igual(cuando.getHours(), 7);
});

prueba("una vez, justo a la hora: no suena dos veces, salta a mañana", () => {
  const desde = new Date(2026, 2, 10, 7, 0, 0);
  const cuando = proximoDisparo(normalizarAlarma({ hora: "07:00" }), desde);

  igual(cuando.getDate(), desde.getDate() + 1);
});

prueba("todos los días, con la hora por llegar: hoy", () => {
  const desde = new Date(2026, 2, 10, 6, 0, 0);
  const alarma = normalizarAlarma({
    hora: "07:00",
    repeticion: REPETICION.PERSONALIZADA,
    dias: [0, 1, 2, 3, 4, 5, 6],
  });

  igual(proximoDisparo(alarma, desde).getDate(), desde.getDate());
});

prueba("solo hoy y la hora ya pasada: la semana que viene", () => {
  const desde = new Date(2026, 2, 10, 8, 0, 0);
  const alarma = normalizarAlarma({
    hora: "07:00",
    repeticion: REPETICION.PERSONALIZADA,
    dias: [desde.getDay()],
  });
  const cuando = proximoDisparo(alarma, desde);

  igual(cuando.getDay(), desde.getDay(), "mismo día de la semana");
  igual(Math.round((cuando - desde) / 3600000), 167, "7 días menos 1 h");
});

prueba("busca el siguiente día marcado", () => {
  const desde = new Date(2026, 2, 10, 8, 0, 0);
  const dentroDeTres = (desde.getDay() + 3) % 7;
  const alarma = normalizarAlarma({
    hora: "07:00",
    repeticion: REPETICION.PERSONALIZADA,
    dias: [dentroDeTres],
  });
  const cuando = proximoDisparo(alarma, desde);

  igual(cuando.getDay(), dentroDeTres);
  cierto(cuando > desde, "tiene que ser futuro");
});

prueba("elige el más cercano de varios días", () => {
  const desde = new Date(2026, 2, 10, 8, 0, 0);
  const manana = (desde.getDay() + 1) % 7;
  const dentroDeCuatro = (desde.getDay() + 4) % 7;
  const alarma = normalizarAlarma({
    hora: "07:00",
    repeticion: REPETICION.PERSONALIZADA,
    dias: [dentroDeCuatro, manana],
  });

  igual(proximoDisparo(alarma, desde).getDay(), manana);
});

prueba("una alarma desactivada no tiene próximo disparo", () => {
  const alarma = normalizarAlarma({ hora: "07:00", activa: false });
  igual(proximoDisparo(alarma, new Date(2026, 2, 10, 6, 0, 0)), null);
});

prueba("una personalizada sin días no puede sonar", () => {
  const alarma = normalizarAlarma({ hora: "07:00", repeticion: REPETICION.PERSONALIZADA });

  igual(alarma.dias, []);
  igual(proximoDisparo(alarma, new Date(2026, 2, 10, 6, 0, 0)), null);
});

prueba("respeta la hora de pared al cruzar el cambio horario", () => {
  // En España el horario de verano entra el último domingo de marzo de 2026
  // (día 29). Una alarma diaria a las 07:00 el día 28 debe sonar a las 07:00
  // del 29, aunque esa noche tenga 23 horas.
  const desde = new Date(2026, 2, 28, 8, 0, 0);
  const alarma = normalizarAlarma({
    hora: "07:00",
    repeticion: REPETICION.PERSONALIZADA,
    dias: [0, 1, 2, 3, 4, 5, 6],
  });
  const cuando = proximoDisparo(alarma, desde);

  igual([cuando.getDate(), cuando.getHours(), cuando.getMinutes()], [29, 7, 0]);
});

/* -------------------------------------------------------------------------- */
/*  Qué debe sonar (motor de disparo)                                         */
/* -------------------------------------------------------------------------- */

grupo("Alarmas que deben sonar");

prueba("una alarma justo en el instante de la comprobación se detecta", () => {
  const desde = new Date(2026, 2, 10, 6, 59, 0);
  const hasta = new Date(2026, 2, 10, 7, 0, 0);
  const alarma = normalizarAlarma({ hora: "07:00" });

  const debidas = alarmasQueDebenSonar([alarma], desde, hasta);

  igual(debidas.length, 1);
  igual(debidas[0].alarma.id, alarma.id);
  igual(debidas[0].cuando.getTime(), hasta.getTime());
});

prueba("una alarma que aún no ha llegado no se detecta", () => {
  const desde = new Date(2026, 2, 10, 6, 0, 0);
  const hasta = new Date(2026, 2, 10, 6, 30, 0);
  const alarma = normalizarAlarma({ hora: "07:00" });

  igual(alarmasQueDebenSonar([alarma], desde, hasta), []);
});

prueba("una alarma ya sonada en una comprobación anterior no vuelve a salir", () => {
  const alarma = normalizarAlarma({ hora: "07:00" });

  // La primera ventana la detecta.
  const primera = alarmasQueDebenSonar(
    [alarma],
    new Date(2026, 2, 10, 6, 59, 0),
    new Date(2026, 2, 10, 7, 0, 0),
  );
  igual(primera.length, 1);

  // La siguiente comprobación arranca justo donde acabó la anterior: no debe
  // volver a contar el mismo disparo.
  const segunda = alarmasQueDebenSonar(
    [alarma],
    primera[0].cuando,
    new Date(2026, 2, 10, 7, 0, 30),
  );
  igual(segunda, []);
});

prueba("una pestaña en segundo plano mucho tiempo: se detecta, no se duplica", () => {
  // El equipo estuvo «dormido» 10 horas; la alarma de las 07:00 debió sonar.
  const desde = new Date(2026, 2, 10, 0, 0, 0);
  const hasta = new Date(2026, 2, 10, 10, 0, 0);
  const alarma = normalizarAlarma({ hora: "07:00" });

  const debidas = alarmasQueDebenSonar([alarma], desde, hasta);

  igual(debidas.length, 1, "solo una vez, no una por cada minuto transcurrido");
  igual(debidas[0].cuando.getHours(), 7);
});

prueba("varias alarmas debidas salen ordenadas por hora", () => {
  const desde = new Date(2026, 2, 10, 6, 0, 0);
  const hasta = new Date(2026, 2, 10, 9, 0, 0);
  const tarde = normalizarAlarma({ nombre: "Tarde", hora: "08:00" });
  const pronto = normalizarAlarma({ nombre: "Pronto", hora: "06:30" });

  const debidas = alarmasQueDebenSonar([tarde, pronto], desde, hasta);

  igual(debidas.map((d) => d.alarma.nombre), ["Pronto", "Tarde"]);
});

prueba("una alarma desactivada nunca se detecta", () => {
  const desde = new Date(2026, 2, 10, 6, 0, 0);
  const hasta = new Date(2026, 2, 10, 8, 0, 0);
  const alarma = normalizarAlarma({ hora: "07:00", activa: false });

  igual(alarmasQueDebenSonar([alarma], desde, hasta), []);
});

prueba("una personalizada sin días marcados nunca se detecta", () => {
  const desde = new Date(2026, 2, 10, 6, 0, 0);
  const hasta = new Date(2026, 2, 10, 8, 0, 0);
  const alarma = normalizarAlarma({ hora: "07:00", repeticion: REPETICION.PERSONALIZADA });

  igual(alarmasQueDebenSonar([alarma], desde, hasta), []);
});

/* -------------------------------------------------------------------------- */
/*  Textos                                                                    */
/* -------------------------------------------------------------------------- */

grupo("Textos para la interfaz");

const personalizada = (dias) =>
  normalizarAlarma({ repeticion: REPETICION.PERSONALIZADA, dias });

prueba("resume la repetición", () => {
  igual(resumenRepeticion(normalizarAlarma({})), "Una vez");
  igual(resumenRepeticion(personalizada([0, 1, 2, 3, 4, 5, 6])), "Todos los días");
  igual(resumenRepeticion(personalizada([1, 2, 3, 4, 5])), "De lunes a viernes");
  igual(resumenRepeticion(personalizada([0, 6])), "Fines de semana");
  igual(resumenRepeticion(personalizada([1, 3, 5])), "L, X, V");
  igual(resumenRepeticion(personalizada([])), "Ningún día");
});

prueba("los días se listan empezando en lunes", () => {
  igual(
    DIAS_SEMANA.map((dia) => dia.corto),
    ["L", "M", "X", "J", "V", "S", "D"],
  );
  igual(resumenRepeticion(personalizada([0, 1])), "L, D");
});

prueba("dice cuánto falta en lenguaje llano", () => {
  const ahora = new Date(2026, 2, 10, 6, 0, 0);
  const dentroDe = (minutos) => new Date(ahora.getTime() + minutos * 60000);

  igual(tiempoHasta(dentroDe(1), ahora), "en 1 min");
  igual(tiempoHasta(dentroDe(45), ahora), "en 45 min");
  igual(tiempoHasta(dentroDe(60), ahora), "en 1 h");
  igual(tiempoHasta(dentroDe(90), ahora), "en 1 h 30 min");
  igual(tiempoHasta(dentroDe(60 * 24), ahora), "en 1 día");
  igual(tiempoHasta(dentroDe(60 * 51), ahora), "en 2 días y 3 h");
  igual(tiempoHasta(dentroDe(0), ahora), "ahora");
});

prueba("ordena por hora y, a igual hora, por nombre", () => {
  const lista = [
    normalizarAlarma({ nombre: "Tarde", hora: "15:00" }),
    normalizarAlarma({ nombre: "Zeta", hora: "07:00" }),
    normalizarAlarma({ nombre: "Alba", hora: "07:00" }),
  ];

  igual(
    ordenarAlarmas(lista).map((alarma) => alarma.nombre),
    ["Alba", "Zeta", "Tarde"],
  );
});

/* -------------------------------------------------------------------------- */
/*  Repositorio                                                              */
/* -------------------------------------------------------------------------- */

grupo("Repositorio");

localStorage.clear();

prueba("arranca vacío", () => {
  igual(listarAlarmas(), []);
  igual(contarAlarmas(), 0);
  igual(proximaAlarma(), null);
});

prueba("guarda y recupera", () => {
  const guardada = guardarAlarma({ nombre: "Trabajo", hora: "06:30" });

  igual(contarAlarmas(), 1);
  igual(obtenerAlarma(guardada.id).nombre, "Trabajo");
  igual(obtenerAlarma(guardada.id).hora, "06:30");
});

prueba("guardar con el mismo id actualiza, no duplica", () => {
  const guardada = guardarAlarma({ nombre: "Gimnasio", hora: "18:00" });
  const antes = contarAlarmas();

  guardarAlarma({ ...guardada, nombre: "Gimnasio tarde" });

  igual(contarAlarmas(), antes, "no debe crecer la lista");
  igual(obtenerAlarma(guardada.id).nombre, "Gimnasio tarde");
});

prueba("al actualizar conserva la fecha de creación", () => {
  const guardada = guardarAlarma({ nombre: "Siesta", hora: "16:00" });
  const actualizada = guardarAlarma({ ...guardada, hora: "16:30" });

  igual(actualizada.creada, guardada.creada);
  cierto(actualizada.modificada >= guardada.modificada, "modificada debe avanzar");
});

prueba("el listado sale ordenado por hora", () => {
  localStorage.clear();
  guardarAlarma({ nombre: "C", hora: "22:00" });
  guardarAlarma({ nombre: "A", hora: "06:00" });
  guardarAlarma({ nombre: "B", hora: "14:00" });

  igual(
    listarAlarmas().map((alarma) => alarma.hora),
    ["06:00", "14:00", "22:00"],
  );
});

prueba("activa y desactiva", () => {
  localStorage.clear();
  const guardada = guardarAlarma({ nombre: "Test", hora: "07:00" });

  igual(guardada.activa, true);
  igual(alternarActiva(guardada.id).activa, false);
  igual(obtenerAlarma(guardada.id).activa, false);
  igual(alternarActiva(guardada.id).activa, true);
});

prueba("marcarComoSonada desactiva una alarma de una vez", () => {
  localStorage.clear();
  const guardada = guardarAlarma({ nombre: "Test", hora: "07:00" });

  igual(marcarComoSonada(guardada.id).activa, false);
  igual(obtenerAlarma(guardada.id).activa, false);
});

prueba("marcarComoSonada no toca una personalizada: seguirá sonando los días marcados", () => {
  localStorage.clear();
  const guardada = guardarAlarma({
    nombre: "Diaria",
    hora: "07:00",
    repeticion: REPETICION.PERSONALIZADA,
    dias: [1, 2, 3, 4, 5],
  });

  igual(marcarComoSonada(guardada.id).activa, true);
  igual(obtenerAlarma(guardada.id).activa, true);
});

prueba("marcarComoSonada sobre una alarma que no existe no revienta", () => {
  igual(marcarComoSonada("no-existe"), null);
});

prueba("desactivar no toca el resto de los datos", () => {
  localStorage.clear();
  const guardada = guardarAlarma({
    nombre: "Completa",
    hora: "05:45",
    repeticion: REPETICION.PERSONALIZADA,
    dias: [1, 3],
    posponer: { veces: 2, minutos: 7 },
  });

  alternarActiva(guardada.id);
  const despues = obtenerAlarma(guardada.id);

  igual(despues.hora, "05:45");
  igual(despues.dias, [1, 3]);
  igual(despues.posponer, { veces: 2, minutos: 7 });
});

prueba("borra solo la que toca", () => {
  localStorage.clear();
  const una = guardarAlarma({ nombre: "Una", hora: "07:00" });
  guardarAlarma({ nombre: "Otra", hora: "08:00" });

  cierto(borrarAlarma(una.id), "debe devolver true");
  igual(contarAlarmas(), 1);
  igual(obtenerAlarma(una.id), null);
});

prueba("borrar algo que no existe devuelve false", () => {
  igual(borrarAlarma("no-existe"), false);
});

prueba("descarta las alarmas con id repetido", () => {
  localStorage.clear();
  localStorage.setItem(
    "radioalarm.alarmas",
    JSON.stringify([
      { id: "repe", nombre: "Primera", hora: "08:00" },
      { id: "repe", nombre: "Segunda", hora: "09:00" },
    ]),
  );

  igual(contarAlarmas(), 1);
  igual(obtenerAlarma("repe").nombre, "Primera");
});

prueba("aguanta un almacenamiento corrupto", () => {
  localStorage.clear();
  localStorage.setItem("radioalarm.alarmas", "{no es json");
  igual(listarAlarmas(), []);

  localStorage.setItem("radioalarm.alarmas", JSON.stringify({ no: "es una lista" }));
  igual(listarAlarmas(), []);
});

prueba("la próxima alarma es la que suena antes", () => {
  localStorage.clear();
  const desde = new Date(2026, 2, 10, 6, 0, 0);
  guardarAlarma({ nombre: "Tarde", hora: "20:00" });
  guardarAlarma({ nombre: "Pronto", hora: "06:30" });
  guardarAlarma({ nombre: "Apagada", hora: "06:15", activa: false });

  igual(proximaAlarma(desde).alarma.nombre, "Pronto");
});

prueba("avisa a quien esté escuchando los cambios", () => {
  localStorage.clear();
  let avisos = 0;
  const baja = alCambiar(() => (avisos += 1));

  guardarAlarma({ nombre: "Con aviso", hora: "07:00" });
  igual(avisos, 1);

  borrarTodas();
  igual(avisos, 2);

  baja();
  guardarAlarma({ nombre: "Ya sin aviso", hora: "08:00" });
  igual(avisos, 2, "tras darse de baja no debe recibir más");
});

/* -------------------------------------------------------------------------- */

resumen();
