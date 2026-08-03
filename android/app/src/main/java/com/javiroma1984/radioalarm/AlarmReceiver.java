package com.javiroma1984.radioalarm;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;

/**
 * Lo que AlarmManager dispara a la hora programada.
 *
 * Su único trabajo es despertar el dispositivo y abrir RadioAlarm: la
 * pantalla de alarma sonando, el sonido en bucle, la vibración y el
 * posponer/descartar ya existen y funcionan en JS (motor/motor.js) — nada
 * de eso se repite aquí.
 *
 * Se intentan dos caminos para que la pantalla de sonando llegue a
 * mostrarse sola, sin que el usuario tenga que tocar nada:
 *
 *   1. Publicar una notificación con `setFullScreenIntent` —el patrón
 *      estándar de Android para apps de alarma o llamada—. Confirmado en
 *      pruebas reales que esto por sí solo no basta en todos los
 *      dispositivos: el sistema puede decidir mostrarla como una
 *      notificación normal en vez de lanzar la actividad, sin avisar de
 *      por qué.
 *   2. Lanzar la actividad directamente desde aquí, con `startActivity`.
 *      Arrancar una actividad "en frío" desde un receiver está
 *      restringido desde Android 10 en la mayoría de los casos, pero
 *      Android documenta una excepción explícita para los `PendingIntent`
 *      que dispara `AlarmManager` —el propio caso de un despertador—, así
 *      que puede funcionar donde el camino 1 no lo hace. Envuelto en
 *      try/catch por si el sistema lo restringe igualmente: si falla, la
 *      notificación del camino 1 sigue ahí como red de seguridad.
 */
public class AlarmReceiver extends BroadcastReceiver {

    private static final String CANAL_ID = "radioalarm-alarmas";
    private static final String EXTRA_ID_ALARMA = "idAlarma";

    @Override
    public void onReceive(Context context, Intent intent) {
        String idAlarma = intent.getStringExtra(EXTRA_ID_ALARMA);

        // Wake lock breve: solo para cubrir el hueco entre que llega el
        // broadcast y queda publicada la notificación. El propio motor JS,
        // ya en marcha con la app abierta, es quien pide la vigilia larga
        // mientras la alarma sigue sonando (js/motor/vigilia.js).
        PowerManager gestorEnergia = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = gestorEnergia == null
            ? null
            : gestorEnergia.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "RadioAlarm:AlarmReceiver");
        if (wakeLock != null) wakeLock.acquire(10000);

        try {
            crearCanalNotificacion(context);

            int idNotificacion = idAlarma != null ? idAlarma.hashCode() : 0;
            PendingIntent pendingAbrir = crearPendingIntentAbrir(context, idAlarma, idNotificacion);

            NotificationCompat.Builder aviso = new NotificationCompat.Builder(context, CANAL_ID)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("RadioAlarm")
                .setContentText("Tu alarma está sonando")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(pendingAbrir, true)
                .setContentIntent(pendingAbrir)
                .setAutoCancel(true);

            NotificationManager gestorNotif =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (gestorNotif != null) gestorNotif.notify(idNotificacion, aviso.build());

            try {
                context.startActivity(crearIntentAbrir(context, idAlarma));
            } catch (Exception excepcion) {
                // Restringido en este Android o fabricante en concreto: queda
                // la notificación de arriba como único camino, a la espera de
                // que el usuario la toque.
            }
        } finally {
            if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        }
    }

    private Intent crearIntentAbrir(Context context, String idAlarma) {
        Intent intentAbrir = new Intent(context, MainActivity.class);
        intentAbrir.putExtra(EXTRA_ID_ALARMA, idAlarma);
        intentAbrir.setFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP
        );
        return intentAbrir;
    }

    private PendingIntent crearPendingIntentAbrir(Context context, String idAlarma, int codigoSolicitud) {
        return PendingIntent.getActivity(
            context,
            codigoSolicitud,
            crearIntentAbrir(context, idAlarma),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    /**
     * Sin sonido propio a propósito: el que suena es el de la app (tono,
     * canción o radio, en bucle con rampa de volumen), no el de la
     * notificación. Un sonido de sistema aquí se solaparía con ese.
     */
    private void crearCanalNotificacion(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager gestor =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (gestor == null) return;

        NotificationChannel canal = new NotificationChannel(CANAL_ID, "Alarmas", NotificationManager.IMPORTANCE_HIGH);
        canal.setDescription("Avisos de alarmas de RadioAlarm");
        canal.setSound(null, null);
        canal.setBypassDnd(true);
        gestor.createNotificationChannel(canal);
    }
}
