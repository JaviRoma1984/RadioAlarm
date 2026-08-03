package com.javiroma1984.radioalarm;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

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

    private static final String CANAL_ID = "radioalarm-alarmas";
    private static final String EXTRA_ID_ALARMA = "idAlarma";

    /** De sobra para que el intento de abrir la actividad surta efecto. */
    private static final long DURACION_MS = 8000;

    private final Handler manejador = new Handler(Looper.getMainLooper());

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String idAlarma = intent != null ? intent.getStringExtra(EXTRA_ID_ALARMA) : null;
        int idNotificacion = idAlarma != null ? idAlarma.hashCode() : 0;

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

        // Todo servicio en primer plano necesita publicar su notificación
        // en los primeros segundos, o el sistema lo mata: es justo la misma
        // notificación de pantalla completa, no una aparte.
        startForeground(idNotificacion, aviso.build());

        try {
            startActivity(crearIntentAbrir(idAlarma));
        } catch (Exception excepcion) {
            // Restringido en este Android o fabricante en concreto: queda la
            // notificación como único camino, a la espera de que el usuario
            // la toque.
        }

        manejador.postDelayed(() -> {
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
     * Sin sonido propio a propósito: el que suena es el de la app (tono,
     * canción o radio, en bucle con rampa de volumen), no el de la
     * notificación. Un sonido de sistema aquí se solaparía con ese.
     */
    private void crearCanalNotificacion() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager gestor = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (gestor == null) return;

        NotificationChannel canal = new NotificationChannel(CANAL_ID, "Alarmas", NotificationManager.IMPORTANCE_HIGH);
        canal.setDescription("Avisos de alarmas de RadioAlarm");
        canal.setSound(null, null);
        canal.setBypassDnd(true);
        gestor.createNotificationChannel(canal);
    }
}
