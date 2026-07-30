/**
 * RadioAlarm · Arnés mínimo de pruebas
 *
 * Nada de framework: cada archivo de prueba es un script de Node normal.
 * `crearArnes()` da un `grupo`/`prueba`/`igual`/`cierto` con contadores
 * propios, para que cada archivo de pruebas (`modelo.test.mjs`,
 * `motor.test.mjs`…) lleve los suyos sin pisarse.
 */

export function crearArnes() {
  let pasadas = 0;
  let fallidas = 0;

  function grupo(nombre) {
    console.log(`\n${nombre}`);
  }

  function prueba(nombre, fn) {
    try {
      fn();
      pasadas += 1;
      console.log(`  ✓ ${nombre}`);
    } catch (error) {
      fallidas += 1;
      console.log(`  ✗ ${nombre}`);
      console.log(`      ${error.message}`);
    }
  }

  function igual(real, esperado, contexto = "") {
    const a = JSON.stringify(real);
    const b = JSON.stringify(esperado);
    if (a !== b) {
      throw new Error(`${contexto ? contexto + ": " : ""}esperaba ${b}, obtuvo ${a}`);
    }
  }

  function cierto(valor, contexto = "esperaba un valor verdadero") {
    if (!valor) throw new Error(contexto);
  }

  /** Imprime el resumen final y termina el proceso con el código adecuado. */
  function resumen() {
    console.log(`\n${"─".repeat(46)}`);
    console.log(`  ${pasadas} pasadas · ${fallidas} fallidas`);
    console.log("─".repeat(46));

    process.exit(fallidas > 0 ? 1 : 0);
  }

  return { grupo, prueba, igual, cierto, resumen };
}
