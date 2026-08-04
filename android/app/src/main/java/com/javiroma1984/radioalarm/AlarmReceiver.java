package com.javiroma1984.radioalarm;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

/**
 * Lo que AlarmManager dispara a la hora programada.
 *
 * Solo entrega el aviso a AlarmService (ver ese archivo), que es quien de
 * verdad publica la notificación e intenta abrir la app: un
 * BroadcastReceiver tiene una ventana de ejecución muy corta, y en cuanto
 * termina, el sistema puede matar el proceso si no queda nada más
 * manteniéndolo vivo. Un servicio en primer plano es un contexto con mucha
 * más prioridad y de vida más larga, y arrancarlo desde aquí está
 * explícitamente permitido por Android —a diferencia de abrir una
 * actividad "en frío" directamente desde un receiver, más restringido—.
 */
public class AlarmReceiver extends BroadcastReceiver {

    /** Mismo tag en todo el codigo nativo, para filtrar en un solo sitio con adb logcat. */
    private static final String TAG = "RadioAlarm";

    private static final String EXTRA_ID_ALARMA = "idAlarma";

    @Override
    public void onReceive(Context context, Intent intent) {
        String idAlarma = intent.getStringExtra(EXTRA_ID_ALARMA);
        Log.i(TAG, "AlarmReceiver.onReceive id=" + idAlarma);
        Registro.agregar(context, "AlarmReceiver.onReceive id=" + idAlarma);

        // Wake lock breve: solo para cubrir el hueco entre que llega el
        // broadcast y el servicio llega a publicar su propia notificación
        // en primer plano.
        PowerManager gestorEnergia = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = gestorEnergia == null
            ? null
            : gestorEnergia.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "RadioAlarm:AlarmReceiver");
        if (wakeLock != null) wakeLock.acquire(10000);

        try {
            Intent intentServicio = new Intent(context, AlarmService.class);
            // Además de idAlarma: tipoSonido/tono/cancionId/emisoraUrl, tal
            // cual los puso AlarmSchedulerPlugin al programar.
            if (intent.getExtras() != null) intentServicio.putExtras(intent.getExtras());

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intentServicio);
            } else {
                context.startService(intentServicio);
            }
            Log.i(TAG, "AlarmReceiver: AlarmService arrancado");
            Registro.agregar(context, "AlarmReceiver: AlarmService arrancado");
        } catch (Exception excepcion) {
            Log.e(TAG, "AlarmReceiver: no se pudo arrancar AlarmService", excepcion);
            Registro.agregar(context, "AlarmReceiver: FALLÓ al arrancar AlarmService: " + excepcion);
        } finally {
            if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        }
    }
}
