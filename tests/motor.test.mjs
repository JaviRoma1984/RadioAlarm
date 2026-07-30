/**
 * RadioAlarm · Pruebas del cronómetro y la cuenta atrás
 *
 * Se ejecutan sin navegador y sin dependencias:
 *
 *     npm test
 *
 * `js/motor/tiempo.js` es lógica pura: cada llamada recibe el instante actual
 * como parámetro en vez de leer `Date.now()` por su cuenta, así que aquí se
 * simula el paso del tiempo con marcas fijas en vez de esperar de verdad.
 */

import { crearArnes } from "./arnes.mjs";

const { grupo, prueba, igual, cierto, resumen } = crearArnes();

const { crearCronometro, crearCuentaAtras, formatoCronometro, formatoReloj } = await import(
  "../js/motor/tiempo.js"
);

/* -------------------------------------------------------------------------- */
/*  Formato                                                                   */
/* -------------------------------------------------------------------------- */

grupo("Formato de reloj (cuenta atrás)");

prueba("segundos y minutos con ceros por delante", () => {
  igual(formatoReloj(0), "00:00");
  igual(formatoReloj(5000), "00:05");
  igual(formatoReloj(65000), "01:05");
});

prueba("pasa a mostrar horas por encima de 59:59", () => {
  igual(formatoReloj(59 * 60000 + 59000), "59:59");
  igual(formatoReloj(60 * 60000), "1:00:00");
  igual(formatoReloj(2 * 3600000 + 5 * 60000 + 9000), "2:05:09");
});

prueba("redondea al segundo más cercano", () => {
  igual(formatoReloj(4600), "00:05");
  igual(formatoReloj(4400), "00:04");
});

prueba("nunca baja de cero aunque le llegue un valor negativo", () => {
  igual(formatoReloj(-500), "00:00");
});

grupo("Formato de cronómetro (con centésimas)");

prueba("centésimas, segundos y minutos con ceros por delante", () => {
  igual(formatoCronometro(0), "00:00.00");
  igual(formatoCronometro(1230), "00:01.23");
  igual(formatoCronometro(65000), "01:05.00");
});

prueba("pasa a mostrar horas por encima de 59:59", () => {
  igual(formatoCronometro(60 * 60000), "1:00:00.00");
});

/* -------------------------------------------------------------------------- */
/*  Cronómetro                                                                */
/* -------------------------------------------------------------------------- */

grupo("Cronómetro");

prueba("arranca en cero y parado", () => {
  const crono = crearCronometro();

  igual(crono.transcurridoMs(0), 0);
  igual(crono.estaCorriendo(), false);
});

prueba("cuenta hacia arriba mientras corre", () => {
  const crono = crearCronometro();

  crono.iniciar(1000);
  igual(crono.transcurridoMs(1500), 500);
  igual(crono.transcurridoMs(3000), 2000);
  igual(crono.estaCorriendo(), true);
});

prueba("pausar congela el tiempo, no lo pierde", () => {
  const crono = crearCronometro();

  crono.iniciar(0);
  crono.pausar(1000);
  igual(crono.transcurridoMs(5000), 1000, "no debe seguir avanzando estando pausado");
  igual(crono.estaCorriendo(), false);
});

prueba("reanudar sigue sumando desde donde se dejó", () => {
  const crono = crearCronometro();

  crono.iniciar(0);
  crono.pausar(1000); // 1000 ms acumulados
  crono.iniciar(2000); // reanuda en el instante 2000
  igual(crono.transcurridoMs(2500), 1500); // 1000 + 500
});

prueba("iniciar dos veces sin pausar no reinicia el tramo en curso", () => {
  const crono = crearCronometro();

  crono.iniciar(0);
  crono.iniciar(500); // se ignora: ya estaba corriendo
  igual(crono.transcurridoMs(1000), 1000);
});

prueba("reiniciar vuelve a cero y para", () => {
  const crono = crearCronometro();

  crono.iniciar(0);
  crono.reiniciar();
  igual(crono.transcurridoMs(9999), 0);
  igual(crono.estaCorriendo(), false);
});

prueba("pausar sin haber iniciado no revienta", () => {
  const crono = crearCronometro();
  crono.pausar(1000);
  igual(crono.transcurridoMs(1000), 0);
});

/* -------------------------------------------------------------------------- */
/*  Cuenta atrás                                                              */
/* -------------------------------------------------------------------------- */

grupo("Cuenta atrás");

prueba("arranca con toda la duración y parada", () => {
  const cuenta = crearCuentaAtras();
  cuenta.establecerDuracion(10000);

  igual(cuenta.tiempoRestanteMs(0), 10000);
  igual(cuenta.estaCorriendo(), false);
  igual(cuenta.haTerminado(), false);
});

prueba("cuenta hacia abajo mientras corre", () => {
  const cuenta = crearCuentaAtras();
  cuenta.establecerDuracion(10000);

  cuenta.iniciar(0);
  igual(cuenta.tiempoRestanteMs(3000), 7000);
});

prueba("no baja de cero aunque se compruebe mucho después de terminar", () => {
  const cuenta = crearCuentaAtras();
  cuenta.establecerDuracion(1000);

  cuenta.iniciar(0);
  igual(cuenta.tiempoRestanteMs(9999), 0);
});

prueba("pausar y reanudar conserva lo que quedaba", () => {
  const cuenta = crearCuentaAtras();
  cuenta.establecerDuracion(10000);

  cuenta.iniciar(0);
  cuenta.pausar(3000); // quedan 7000
  igual(cuenta.tiempoRestanteMs(999999), 7000, "pausada no debe seguir bajando");

  cuenta.iniciar(5000); // reanuda con 7000 restantes
  igual(cuenta.tiempoRestanteMs(6000), 6000);
});

prueba("comprobar solo avisa una vez de que ha terminado", () => {
  const cuenta = crearCuentaAtras();
  cuenta.establecerDuracion(1000);

  cuenta.iniciar(0);
  igual(cuenta.comprobar(500), false, "todavía no ha llegado a cero");
  igual(cuenta.comprobar(1000), true, "primera vez que se detecta el final");
  igual(cuenta.comprobar(1500), false, "ya se avisó: no debe repetirse");
  igual(cuenta.haTerminado(), true);
  igual(cuenta.estaCorriendo(), false, "al terminar se para sola");
});

prueba("comprobar no hace nada si no está corriendo", () => {
  const cuenta = crearCuentaAtras();
  cuenta.establecerDuracion(1000);

  igual(cuenta.comprobar(2000), false);
});

prueba("no se puede iniciar una cuenta atrás ya terminada sin reiniciarla", () => {
  const cuenta = crearCuentaAtras();
  cuenta.establecerDuracion(1000);

  cuenta.iniciar(0);
  cuenta.comprobar(1000);
  cuenta.iniciar(2000); // debe ignorarse: sigue "terminado"
  igual(cuenta.estaCorriendo(), false);
});

prueba("no se puede iniciar con la duración a cero", () => {
  const cuenta = crearCuentaAtras();
  cuenta.establecerDuracion(0);

  cuenta.iniciar(0);
  igual(cuenta.estaCorriendo(), false);
});

prueba("reiniciar tras terminar vuelve a dejarla lista", () => {
  const cuenta = crearCuentaAtras();
  cuenta.establecerDuracion(1000);

  cuenta.iniciar(0);
  cuenta.comprobar(1000);
  cuenta.reiniciar();

  igual(cuenta.haTerminado(), false);
  igual(cuenta.tiempoRestanteMs(0), 1000);

  cuenta.iniciar(0);
  cierto(cuenta.estaCorriendo(), "ahora sí debe poder arrancar de nuevo");
});

prueba("establecerDuracion durante la marcha la deja lista desde cero", () => {
  const cuenta = crearCuentaAtras();
  cuenta.establecerDuracion(10000);
  cuenta.iniciar(0);

  cuenta.establecerDuracion(5000);

  igual(cuenta.estaCorriendo(), false);
  igual(cuenta.tiempoRestanteMs(0), 5000);
  igual(cuenta.duracion(), 5000);
});

/* -------------------------------------------------------------------------- */

resumen();
