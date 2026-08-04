package com.javiroma1984.radioalarm;

import android.content.Context;
import android.content.SharedPreferences;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Registro de diagnóstico persistente, pensado para verse desde la propia
 * app (pantalla de Sonido) sin depender de conectar el móvil a un
 * ordenador con adb.
 *
 * `AlarmSchedulerPlugin`, `AlarmReceiver` y `AlarmService` van añadiendo una
 * línea aquí en cada paso de la cadena —programar, recibir el broadcast,
 * arrancar el servicio, publicar la notificación, intentar abrir la
 * actividad—, además de su `Log.i`/`Log.e` de siempre. `SharedPreferences`
 * sobrevive a que la app se cierre del todo, que es justo cuando hace falta
 * ver qué ha pasado.
 */
final class Registro {

    private static final String PREFS = "radioalarm-registro";
    private static final String CLAVE = "lineas";

    /** Bastante para ver toda una cadena de disparo sin crecer sin límite. */
    private static final int MAX_LINEAS = 80;

    private Registro() {}

    static void agregar(Context context, String mensaje) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String marca = new SimpleDateFormat("dd/MM HH:mm:ss", Locale.getDefault()).format(new Date());

        String anterior = prefs.getString(CLAVE, "");
        String[] lineas = anterior.isEmpty() ? new String[0] : anterior.split("\n");

        StringBuilder nuevo = new StringBuilder();
        int desde = Math.max(0, lineas.length - (MAX_LINEAS - 1));
        for (int i = desde; i < lineas.length; i++) {
            nuevo.append(lineas[i]).append('\n');
        }
        nuevo.append('[').append(marca).append("] ").append(mensaje);

        prefs.edit().putString(CLAVE, nuevo.toString()).apply();
    }

    static String leer(Context context) {
        String texto = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(CLAVE, "");
        return texto.isEmpty() ? "(vacío: todavía no ha pasado nada que registrar)" : texto;
    }

    static void borrar(Context context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply();
    }
}
