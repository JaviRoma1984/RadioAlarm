package com.javiroma1984.radioalarm;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * Lo que AlarmReceiver arranca al sonar una alarma.
 *
 * Su trabajo es dar el empujón inicial para que la pantalla de sonando
 * llegue a abrirse sola, con dos caminos a la vez —una notificación con
 * `setFullScreenIntent` y, además, `startActivity` directo, con más
 * probabilidad de conseguirlo al venir de un servicio en primer plano que
 * desde el propio receiver—. No repite nada de lo que ya hace la app en
 * JS: el sonido en bucle, la vibración, el posponer/descartar. Por eso se
 * para solo a los pocos segundos, tanto si la actividad llegó a abrirse
 * como si no: su función es ese empujón, no seguir viva sonando ella misma.
 */
public class AlarmService extends Service {

    /** Mismo tag en todo el codigo nativo, para filtrar en un solo sitio con adb logcat. */
    private static final String TAG = "RadioAlarm";

    /**
     * "-2": los canales de notificación son inmutables una vez creados —a
     * un móvil que ya tuviera instalada una versión anterior con el canal
     * "radioalarm-alarmas" (sonido nulo a propósito), volver a llamar a
     * createNotificationChannel con el mismo id no le cambia el sonido. Se
     * usa un id nuevo para forzar un canal fresco con el sonido de verdad,
     * borrando el viejo para no dejarlo huérfano en los ajustes del sistema.
     */
    private static final String CANAL_ID = "radioalarm-alarmas-2";
    private static final String CANAL_ID_ANTIGUO = "radioalarm-alarmas";
    private static final String EXTRA_ID_ALARMA = "idAlarma";

    /** De sobra para que el intento de abrir la actividad surta efecto. */
    private static final long DURACION_MS = 8000;

    private final Handler manejador = new Handler(Looper.getMainLooper());

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String idAlarma = intent != null ? intent.getStringExtra(EXTRA_ID_ALARMA) : null;
        int idNotificacion = idAlarma != null ? idAlarma.hashCode() : 0;
        Log.i(TAG, "AlarmService.onStartCommand id=" + idAlarma);
        Registro.agregar(this, "AlarmService.onStartCommand id=" + idAlarma
            + " (exención batería=" + tieneExencionBateria() + ", pantalla completa=" + tienePantallaCompleta() + ")");

        crearCanalNotificacion();

        PendingIntent pendingAbrir = crearPendingIntentAbrir(idAlarma, idNotificacion);

        NotificationCompat.Builder aviso = new NotificationCompat.Builder(this, CANAL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("RadioAlarm")
            .setContentText("Tu alarma está sonando")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(pendingAbrir, true)
            .setContentIntent(pendingAbrir)
            .setOngoing(true);

        try {
            // Todo servicio en primer plano necesita publicar su
            // notificación en los primeros segundos, o el sistema lo mata:
            // es justo la misma notificación de pantalla completa, no una
            // aparte.
            startForeground(idNotificacion, aviso.build());
            Log.i(TAG, "AlarmService: startForeground OK");
            Registro.agregar(this, "AlarmService: startForeground OK");
        } catch (Exception excepcion) {
            Log.e(TAG, "AlarmService: startForeground FALLÓ", excepcion);
            Registro.agregar(this, "AlarmService: startForeground FALLÓ: " + excepcion);
        }

        try {
            startActivity(crearIntentAbrir(idAlarma));
            Log.i(TAG, "AlarmService: startActivity OK");
            Registro.agregar(this, "AlarmService: startActivity OK");
        } catch (Exception excepcion) {
            // Restringido en este Android o fabricante en concreto: queda la
            // notificación como único camino, a la espera de que el usuario
            // la toque.
            Log.e(TAG, "AlarmService: startActivity FALLÓ", excepcion);
            Registro.agregar(this, "AlarmService: startActivity FALLÓ: " + excepcion);
        }

        manejador.postDelayed(() -> {
            Log.i(TAG, "AlarmService: parando tras " + DURACION_MS + "ms");
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
        }, DURACION_MS);

        return START_NOT_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    /**
     * Registrados en cada disparo, no solo al pedirlos: si ColorOS revoca
     * alguno de estos dos por su cuenta después de la primera alarma —algo
     * que hacen algunos fabricantes como "autoprotección" tras detectar
     * actividad en segundo plano—, se verá comparando el primer disparo con
     * los siguientes sin depender de que el usuario vuelva a mirar los
     * ajustes a mano.
     */
    private boolean tieneExencionBateria() {
        PowerManager gestor = (PowerManager) getSystemService(Context.POWER_SERVICE);
        return gestor != null && gestor.isIgnoringBatteryOptimizations(getPackageName());
    }

    private boolean tienePantallaCompleta() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return true;
        NotificationManager gestor = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        return gestor != null && gestor.canUseFullScreenIntent();
    }

    private Intent crearIntentAbrir(String idAlarma) {
        Intent intentAbrir = new Intent(this, MainActivity.class);
        intentAbrir.putExtra(EXTRA_ID_ALARMA, idAlarma);
        intentAbrir.setFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP
        );
        return intentAbrir;
    }

    private PendingIntent crearPendingIntentAbrir(String idAlarma, int codigoSolicitud) {
        return PendingIntent.getActivity(
            this,
            codigoSolicitud,
            crearIntentAbrir(idAlarma),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    /**
     * Lleva su propio sonido y vibración de alarma a propósito: en teoría
     * quien suena es la app (tono, canción o radio en bucle), pero
     * `startActivity` desde un servicio en segundo plano no siempre consigue
     * traerla al frente sola (Android y, más aún, ColorOS pueden bloquearlo
     * en silencio, sin lanzar ningún error). Si eso pasa, esta notificación
     * es lo único que le queda al usuario para darse cuenta de que hay una
     * alarma sonando —antes se dejaba muda a propósito, asumiendo que la app
     * sí se abriría, y por eso no pasaba nada perceptible—.
     */
    private void crearCanalNotificacion() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager gestor = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (gestor == null) return;

        gestor.deleteNotificationChannel(CANAL_ID_ANTIGUO);

        Uri sonidoAlarma = RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM);
        if (sonidoAlarma == null) sonidoAlarma = Settings.System.DEFAULT_ALARM_ALERT_URI;

        NotificationChannel canal = new NotificationChannel(CANAL_ID, "Alarmas", NotificationManager.IMPORTANCE_HIGH);
        canal.setDescription("Avisos de alarmas de RadioAlarm");
        canal.setSound(sonidoAlarma, new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build());
        canal.enableVibration(true);
        canal.setVibrationPattern(new long[] { 0, 800, 400, 800, 400, 800 });
        canal.setBypassDnd(true);
        gestor.createNotificationChannel(canal);
    }
}
