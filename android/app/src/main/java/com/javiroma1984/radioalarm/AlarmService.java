package com.javiroma1984.radioalarm;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

import java.io.File;
import java.io.FileNotFoundException;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * Lo que AlarmReceiver arranca al sonar una alarma.
 *
 * Además de dar el empujón para que la pantalla de sonando llegue a abrirse
 * sola —notificación con `setFullScreenIntent` y `startActivity` directo—,
 * reproduce el sonido de la alarma él mismo (tono, canción o radio, en
 * bucle y con rampa de volumen). No es redundante con lo que hace la app en
 * JS: es la red de seguridad para cuando la app está completamente cerrada
 * y el JS nunca llega a arrancar —lo que en la práctica pasa a menudo, sobre
 * todo en fabricantes como ColorOS—. Si la app sí llega a abrirse y su
 * propio motor JS decide sonar, avisa a este servicio con
 * `AlarmSchedulerPlugin.detenerSonidoNativo()` para no solaparse.
 */
public class AlarmService extends Service {

    /** Mismo tag en todo el codigo nativo, para filtrar en un solo sitio con adb logcat. */
    private static final String TAG = "RadioAlarm";

    /**
     * "-3": los canales de notificación son inmutables una vez creados. Este
     * canal empezó silencioso, luego se le dio sonido propio como red de
     * seguridad (mientras el servicio no reproducía nada él mismo), y ahora
     * que el servicio sí reproduce el sonido correcto de verdad, vuelve a
     * ser silencioso para no solaparse —un id nuevo cada vez que cambian
     * estos ajustes es la única forma de que un móvil que ya tuviera una
     * versión anterior instalada reciba el cambio—.
     */
    private static final String CANAL_ID = "radioalarm-alarmas-3";
    private static final String[] CANALES_ANTIGUOS = { "radioalarm-alarmas", "radioalarm-alarmas-2" };
    private static final String EXTRA_ID_ALARMA = "idAlarma";
    private static final String EXTRA_TIPO = "tipoSonido";
    private static final String EXTRA_TONO = "tono";
    private static final String EXTRA_CANCION_ID = "cancionId";
    private static final String EXTRA_EMISORA_URL = "emisoraUrl";
    private static final String EXTRA_ASCENDENTE = "ascendente";
    static final String ACCION_DETENER = "com.javiroma1984.radioalarm.DETENER_SONIDO";

    /** Igual que RAMPA_MS en motor.js: cuánto tarda el sonido en llegar al volumen normal. */
    private static final long RAMPA_MS = 20000;
    /** Igual que PASO_RAMPA_MS en reproductor.js: cada cuánto se sube un escalón. */
    private static final long PASO_RAMPA_MS = 200;
    /** Proporción equivalente a VOLUMEN_INICIAL_ALARMA/VOLUMEN_MAESTRO en sintetizador.js. */
    private static final float VOLUMEN_INICIAL_TONO = 0.05f / 0.28f;
    /** Igual que VOLUMEN_INICIAL_ALARMA en reproductor.js, para canción y radio. */
    private static final float VOLUMEN_INICIAL_MEDIA = 0.08f;

    private final Handler manejadorRampa = new Handler(Looper.getMainLooper());
    private MediaPlayer mediaPlayer;
    private int pasoRampaActual;
    private int pasosRampaTotal;
    private float volumenRampaInicio;

    private final Runnable pasoRampaRunnable = new Runnable() {
        @Override
        public void run() {
            pasoRampaActual += 1;
            float incremento = (1f - volumenRampaInicio) / pasosRampaTotal;
            float volumen = Math.min(1f, volumenRampaInicio + incremento * pasoRampaActual);

            if (mediaPlayer != null) {
                try {
                    mediaPlayer.setVolume(volumen, volumen);
                } catch (Exception ignorado) {
                    // El MediaPlayer ya se liberó entre un paso y el siguiente.
                }
            }

            if (pasoRampaActual < pasosRampaTotal) manejadorRampa.postDelayed(this, PASO_RAMPA_MS);
        }
    };

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACCION_DETENER.equals(intent.getAction())) {
            // Llega tanto del botón «Descartar» de la notificación como de
            // detenerSonidoNativo() (el JS tomando el control): en los dos
            // casos, parar es lo único que hace falta.
            Log.i(TAG, "AlarmService: detenido (botón Descartar o JS)");
            Registro.agregar(this, "AlarmService: detenido (botón Descartar o JS)");
            detenerReproduccion();
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }

        String idAlarma = intent != null ? intent.getStringExtra(EXTRA_ID_ALARMA) : null;
        String tipo = intent != null ? intent.getStringExtra(EXTRA_TIPO) : null;
        String tono = intent != null ? intent.getStringExtra(EXTRA_TONO) : null;
        String cancionId = intent != null ? intent.getStringExtra(EXTRA_CANCION_ID) : null;
        String emisoraUrl = intent != null ? intent.getStringExtra(EXTRA_EMISORA_URL) : null;
        boolean ascendente = intent == null || intent.getBooleanExtra(EXTRA_ASCENDENTE, true);
        int idNotificacion = idAlarma != null ? idAlarma.hashCode() : 0;

        Log.i(TAG, "AlarmService.onStartCommand id=" + idAlarma + " tipo=" + tipo);
        Registro.agregar(this, "AlarmService.onStartCommand id=" + idAlarma + " tipo=" + tipo
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
            .setOngoing(true)
            // Para poder parar la alarma con un toque aunque la actividad no
            // llegue a abrirse sola —lo que en la práctica pasa a menudo con
            // la app cerrada, sobre todo en ColorOS—: sin esto, la única
            // forma de silenciarla sería que la pantalla de la app se
            // abriera por su cuenta.
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Descartar", crearPendingIntentDescartar(idNotificacion));

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
            // la toque. El sonido de abajo suena igual, lo consiga o no.
            Log.e(TAG, "AlarmService: startActivity FALLÓ", excepcion);
            Registro.agregar(this, "AlarmService: startActivity FALLÓ: " + excepcion);
        }

        iniciarReproduccion(tipo, tono, cancionId, emisoraUrl, ascendente);

        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        detenerReproduccion();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    /* -------------------------------------------------------------------------- */
    /*  Reproducción                                                              */
    /* -------------------------------------------------------------------------- */

    /**
     * Arranca el sonido según la fuente configurada en la alarma, con el
     * mismo respaldo al tono que `motor.js`: si la canción ya no está
     * exportada o la emisora no carga, cae al tono en vez de quedarse muda.
     */
    private void iniciarReproduccion(String tipo, String tono, String cancionId, String emisoraUrl, boolean ascendente) {
        detenerReproduccion();

        mediaPlayer = new MediaPlayer();
        mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .build());

        boolean bucle = true;
        float volumenInicio;

        try {
            if ("cancion".equals(tipo) && cancionId != null) {
                File fichero = new File(new File(getFilesDir(), "canciones"), cancionId);
                if (!fichero.exists()) throw new FileNotFoundException("Canción no exportada: " + cancionId);
                mediaPlayer.setDataSource(fichero.getAbsolutePath());
                volumenInicio = VOLUMEN_INICIAL_MEDIA;
            } else if ("radio".equals(tipo) && emisoraUrl != null) {
                mediaPlayer.setDataSource(emisoraUrl);
                bucle = false;
                volumenInicio = VOLUMEN_INICIAL_MEDIA;
            } else {
                volumenInicio = configurarTono(tono);
            }
        } catch (Exception excepcion) {
            Log.e(TAG, "AlarmService: fuente de sonido (" + tipo + ") falló, cae al tono", excepcion);
            Registro.agregar(this, "AlarmService: fuente de sonido (" + tipo + ") falló, cae al tono: " + excepcion);
            mediaPlayer.reset();
            bucle = true;
            try {
                volumenInicio = configurarTono(tono);
            } catch (Exception otraVez) {
                Log.e(TAG, "AlarmService: tampoco se pudo reproducir el tono de respaldo", otraVez);
                Registro.agregar(this, "AlarmService: tampoco se pudo reproducir el tono de respaldo: " + otraVez);
                return;
            }
        }

        // Sin rampa (`ascendente=false`): a todo volumen desde ya, sin pasar
        // por el volumen inicial bajo del modo ascendente.
        final float volumenInicioFinal = ascendente ? volumenInicio : 1f;
        mediaPlayer.setLooping(bucle);
        mediaPlayer.setVolume(volumenInicioFinal, volumenInicioFinal);
        mediaPlayer.setOnPreparedListener(mp -> {
            mp.start();
            if (ascendente) iniciarRampa(volumenInicioFinal);
            Registro.agregar(this, "AlarmService: reproducción en marcha");
        });
        mediaPlayer.setOnErrorListener((mp, what, extra) -> {
            Registro.agregar(this, "AlarmService: MediaPlayer error what=" + what + " extra=" + extra);
            return true;
        });

        try {
            mediaPlayer.prepareAsync();
        } catch (Exception excepcion) {
            Log.e(TAG, "AlarmService: prepareAsync falló", excepcion);
            Registro.agregar(this, "AlarmService: prepareAsync falló: " + excepcion);
        }
    }

    /**
     * Cambia `mediaPlayer` (ya creado por `iniciarReproduccion`) a uno de los
     * 9 tonos renderizados como WAV por `tools/generar-tonos.mjs` —el
     * sintetizador Web Audio de la app no existe fuera de la WebView, así
     * que esto es lo más parecido posible sin ella—.
     */
    private float configurarTono(String tono) throws Exception {
        String nombreRecurso = "tono_" + (tono != null ? tono : "clasico");
        int idRecurso = getResources().getIdentifier(nombreRecurso, "raw", getPackageName());
        if (idRecurso == 0) idRecurso = getResources().getIdentifier("tono_clasico", "raw", getPackageName());
        if (idRecurso == 0) throw new FileNotFoundException("Sin tonos empaquetados");

        AssetFileDescriptor descriptor = getResources().openRawResourceFd(idRecurso);
        mediaPlayer.setDataSource(descriptor.getFileDescriptor(), descriptor.getStartOffset(), descriptor.getLength());
        descriptor.close();

        return VOLUMEN_INICIAL_TONO;
    }

    private void iniciarRampa(float volumenInicio) {
        volumenRampaInicio = volumenInicio;
        pasosRampaTotal = (int) Math.max(1, RAMPA_MS / PASO_RAMPA_MS);
        pasoRampaActual = 0;
        manejadorRampa.postDelayed(pasoRampaRunnable, PASO_RAMPA_MS);
    }

    private void detenerReproduccion() {
        manejadorRampa.removeCallbacks(pasoRampaRunnable);

        if (mediaPlayer != null) {
            try {
                mediaPlayer.stop();
            } catch (Exception ignorado) {
                // Puede que ni llegara a prepararse: nada que parar.
            }
            mediaPlayer.release();
            mediaPlayer = null;
        }
    }

    /* -------------------------------------------------------------------------- */
    /*  Diagnóstico y notificación                                                */
    /* -------------------------------------------------------------------------- */

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

    /** El botón «Descartar» de la notificación: reutiliza ACCION_DETENER tal cual. */
    private PendingIntent crearPendingIntentDescartar(int codigoSolicitud) {
        Intent intent = new Intent(this, AlarmService.class);
        intent.setAction(ACCION_DETENER);

        return PendingIntent.getService(
            this,
            codigoSolicitud,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    /**
     * Silenciosa a propósito: ahora el sonido real (tono/canción/radio) lo
     * pone `iniciarReproduccion`, así que un sonido de sistema aquí se
     * solaparía con ese en vez de servir de red de seguridad.
     */
    private void crearCanalNotificacion() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager gestor = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (gestor == null) return;

        for (String canalAntiguo : CANALES_ANTIGUOS) gestor.deleteNotificationChannel(canalAntiguo);

        NotificationChannel canal = new NotificationChannel(CANAL_ID, "Alarmas", NotificationManager.IMPORTANCE_HIGH);
        canal.setDescription("Avisos de alarmas de RadioAlarm");
        canal.setSound(null, null);
        canal.enableVibration(true);
        canal.setVibrationPattern(new long[] { 0, 800, 400, 800, 400, 800 });
        canal.setBypassDnd(true);
        gestor.createNotificationChannel(canal);
    }
}
