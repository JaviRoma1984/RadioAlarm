package com.javiroma1984.radioalarm;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import java.util.Date;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONException;

/**
 * Puente entre el JS de RadioAlarm y AlarmManager.
 *
 * Solo programa y despierta: qué alarma debe sonar y cuándo lo decide
 * siempre el JS (js/nativo.js, con la misma lógica ya probada de
 * model/alarma.js), nunca este plugin. Usa setAlarmClock en vez de
 * setExact/setExactAndAllowWhileIdle porque es la API pensada para apps de
 * tipo "despertador": queda exenta de las restricciones de Doze/ahorro de
 * batería que sí afectan a las demás, y muestra el icono de reloj propio de
 * una alarma en la barra de estado.
 */
@CapacitorPlugin(
    name = "AlarmScheduler",
    permissions = {
        @Permission(alias = "notificaciones", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class AlarmSchedulerPlugin extends Plugin {

    /** Mismo tag en todo el código nativo, para filtrar en un solo sitio con adb logcat. */
    private static final String TAG = "RadioAlarm";

    @PluginMethod
    public void programar(PluginCall call) {
        String id = call.getString("id");
        Long cuando = call.getLong("cuando");

        if (id == null || cuando == null) {
            call.reject("Faltan datos: se necesitan \"id\" y \"cuando\"");
            return;
        }

        AlarmManager gestor = obtenerGestor();
        if (gestor == null) {
            call.reject("AlarmManager no disponible");
            return;
        }

        AlarmManager.AlarmClockInfo info = new AlarmManager.AlarmClockInfo(cuando, crearPendingIntentMostrar());
        gestor.setAlarmClock(info, crearPendingIntentDisparo(id));
        Log.i(TAG, "programar id=" + id + " cuando=" + new Date(cuando) + " (permiso alarmas exactas=" + puedeProgramarExactas() + ")");

        call.resolve();
    }

    @PluginMethod
    public void cancelar(PluginCall call) {
        String id = call.getString("id");
        if (id == null) {
            call.reject("Falta \"id\"");
            return;
        }

        Log.i(TAG, "cancelar id=" + id);
        AlarmManager gestor = obtenerGestor();
        if (gestor != null) {
            gestor.cancel(crearPendingIntentDisparo(id));
        }

        call.resolve();
    }

    @PluginMethod
    public void cancelarTodas(PluginCall call) {
        JSArray ids = call.getArray("ids");
        AlarmManager gestor = obtenerGestor();

        if (gestor != null && ids != null) {
            try {
                for (Object id : ids.toList()) {
                    gestor.cancel(crearPendingIntentDisparo(String.valueOf(id)));
                }
            } catch (JSONException excepcion) {
                call.reject("La lista de ids no es válida", excepcion);
                return;
            }
        }

        call.resolve();
    }

    @PluginMethod
    public void tienePermisoAlarmasExactas(PluginCall call) {
        JSObject resultado = new JSObject();
        resultado.put("concedido", puedeProgramarExactas());
        call.resolve(resultado);
    }

    /** Abre los ajustes del sistema donde el usuario concede el permiso, si hace falta. */
    @PluginMethod
    public void solicitarPermisoAlarmasExactas(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !puedeProgramarExactas()) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }

        call.resolve();
    }

    /**
     * Fuerza el encendido real de la pantalla, aunque estuviera apagada por
     * el móvil bloqueado a mano.
     *
     * `setShowWhenLocked`/`setTurnScreenOn` de MainActivity (ver ese
     * archivo) solo sirven cuando la actividad se abre o se trae al frente
     * de nuevo con la pantalla apagada —el caso de una notificación a
     * pantalla completa—; no hacen nada si la actividad ya estaba abierta y
     * en pausa, que es justo lo que pasa cuando la app se deja abierta y se
     * bloquea el móvil a mano antes de que suene la alarma: el motor JS
     * (que sigue corriendo) detecta la alarma él solo, pero la pantalla
     * sigue apagada hasta que alguien la desbloquea. Un wake lock con
     * `ACQUIRE_CAUSES_WAKEUP` sí la encita de verdad en ese momento. Se
     * suelta a los 10 segundos: de ahí en adelante, la propia Wake Lock web
     * de la app (ya con la pantalla encendida y la página visible) la
     * mantiene encendida.
     */
    @SuppressWarnings("deprecation")
    @PluginMethod
    public void encenderPantalla(PluginCall call) {
        PowerManager gestor = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);

        if (gestor != null) {
            PowerManager.WakeLock wakeLock = gestor.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
                "RadioAlarm:EncenderPantalla"
            );
            wakeLock.acquire(10000);
        }

        call.resolve();
    }

    @PluginMethod
    public void tienePermisoPantallaCompleta(PluginCall call) {
        JSObject resultado = new JSObject();
        resultado.put("concedido", puedeUsarPantallaCompleta());
        call.resolve(resultado);
    }

    /**
     * Igual que las alarmas exactas: en Android 14+ este permiso también
     * hay que concederlo a mano en los ajustes del sistema. Sin él, la
     * notificación de pantalla completa de AlarmReceiver se queda como una
     * notificación normal —nunca llega a abrir la app sola—, que es
     * necesario sobre todo cuando la app está cerrada del todo (con la app
     * abierta, `encenderPantalla` ya cubre el caso más común).
     */
    @PluginMethod
    public void solicitarPermisoPantallaCompleta(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE && !puedeUsarPantallaCompleta()) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }

        call.resolve();
    }

    /**
     * A diferencia de los otros dos, este es un permiso "normal" (no de
     * acceso especial): se pide con el diálogo de siempre del sistema, no
     * abriendo los ajustes. Sin concederlo, `NotificationManager.notify()`
     * de AlarmReceiver no hace nada en absoluto —ni error ni aviso, solo
     * silencio—, así que ni la notificación ni la pantalla completa ni la
     * apertura de la app llegan a pasar nunca. Es el que de verdad hacía
     * falta para que la alarma sonara con la app cerrada del todo.
     */
    @PluginMethod
    public void tienePermisoNotificaciones(PluginCall call) {
        JSObject resultado = new JSObject();
        resultado.put("concedido", tieneNotificacionesConcedidas());
        call.resolve(resultado);
    }

    @PluginMethod
    public void solicitarPermisoNotificaciones(PluginCall call) {
        if (tieneNotificacionesConcedidas()) {
            call.resolve();
            return;
        }

        requestPermissionForAlias("notificaciones", call, "alRecibirPermisoNotificaciones");
    }

    @PermissionCallback
    private void alRecibirPermisoNotificaciones(PluginCall call) {
        JSObject resultado = new JSObject();
        resultado.put("concedido", tieneNotificacionesConcedidas());
        call.resolve(resultado);
    }

    private boolean tieneNotificacionesConcedidas() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true;

        return getPermissionState("notificaciones") == PermissionState.GRANTED;
    }

    /**
     * El sistema puede matar la app en segundo plano —y con ella, cualquier
     * proceso que quedara vivo— antes de que llegue la hora de una alarma,
     * si no está eximida del ahorro de batería. A diferencia de los otros
     * tres, esta petición muestra un diálogo directo del sistema, no una
     * pantalla de ajustes para navegar.
     *
     * Esto es solo la parte "de Android en sí": los fabricantes con
     * gestión de batería propia (ColorOS de Oppo, entre otros) pueden tener
     * además su propio interruptor de "autoarranque" que esta llamada no
     * toca —no hay ninguna API pública para eso—.
     */
    @PluginMethod
    public void tieneExencionBateria(PluginCall call) {
        JSObject resultado = new JSObject();
        resultado.put("concedido", tieneExencionBateriaConcedida());
        call.resolve(resultado);
    }

    @PluginMethod
    public void solicitarExencionBateria(PluginCall call) {
        if (!tieneExencionBateriaConcedida()) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }

        call.resolve();
    }

    private boolean tieneExencionBateriaConcedida() {
        PowerManager gestor = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        return gestor != null && gestor.isIgnoringBatteryOptimizations(getContext().getPackageName());
    }

    /**
     * Pantallas de "autoarranque"/"actividad en segundo plano" propias de
     * ColorOS (Oppo): no son API pública de Android, así que no hay ninguna
     * forma de comprobar si ya están concedidas —a diferencia de los otros
     * permisos, JS se limita a marcar este paso como hecho en cuanto se
     * abre una vez, confiando en que el usuario lo puso—. El nombre exacto
     * de la pantalla varía según la versión de ColorOS, así que se prueban
     * varias por orden; si ninguna existe en este móvil en concreto, se cae
     * a los ajustes generales de la app, donde el usuario puede buscarlo a
     * mano.
     */
    @PluginMethod
    public void abrirAjustesAutoarranque(PluginCall call) {
        String[][] candidatos = {
            { "com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity" },
            { "com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity" },
            { "com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity" },
        };

        for (String[] candidato : candidatos) {
            try {
                Intent intent = new Intent();
                intent.setClassName(candidato[0], candidato[1]);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve();
                return;
            } catch (Exception excepcion) {
                // Esta variante no existe en esta versión de ColorOS: se
                // prueba la siguiente antes de caer al último recurso.
            }
        }

        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        } catch (Exception excepcion) {
            call.reject("No se ha podido abrir ningún ajuste", excepcion);
            return;
        }

        call.resolve();
    }

    /**
     * Si la app se ha abierto porque una notificación de alarma la lanzó
     * (pantalla bloqueada o app cerrada), devuelve el id de esa alarma y lo
     * consume: una llamada posterior ya no lo repite, así que al pasar a
     * segundo plano y reabrir la app "a mano" no se vuelve a disparar sola.
     */
    @PluginMethod
    public void comprobarLanzamiento(PluginCall call) {
        JSObject resultado = new JSObject();

        if (getActivity() != null && getActivity().getIntent() != null) {
            String idAlarma = getActivity().getIntent().getStringExtra("idAlarma");
            resultado.put("idAlarma", idAlarma);
            getActivity().getIntent().removeExtra("idAlarma");
        }

        call.resolve(resultado);
    }

    /**
     * La actividad ya existía (la app estaba abierta) y una alarma nativa
     * acaba de lanzarla de nuevo: a diferencia de un arranque en frío, esto
     * no pasa por `load()` ni por `comprobarLanzamiento()`, así que se avisa
     * al JS directamente con un evento.
     */
    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);

        String idAlarma = intent.getStringExtra("idAlarma");
        if (idAlarma == null) return;

        intent.removeExtra("idAlarma");

        JSObject datos = new JSObject();
        datos.put("idAlarma", idAlarma);
        notifyListeners("alarmaLanzada", datos);
    }

    private boolean puedeProgramarExactas() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;

        AlarmManager gestor = obtenerGestor();
        return gestor != null && gestor.canScheduleExactAlarms();
    }

    private boolean puedeUsarPantallaCompleta() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return true;

        NotificationManager gestor = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        return gestor != null && gestor.canUseFullScreenIntent();
    }

    private AlarmManager obtenerGestor() {
        return (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
    }

    /** El broadcast que AlarmManager dispara a la hora programada. */
    private PendingIntent crearPendingIntentDisparo(String id) {
        Intent intent = new Intent(getContext(), AlarmReceiver.class);
        intent.putExtra("idAlarma", id);

        return PendingIntent.getBroadcast(
            getContext(),
            id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    /**
     * Lo que el sistema abre si el usuario toca el icono de alarma de la
     * barra de estado antes de que llegue a sonar. No lleva el id: solo
     * abre la app en su estado normal, no dispara nada.
     */
    private PendingIntent crearPendingIntentMostrar() {
        Intent intent = new Intent(getContext(), MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        return PendingIntent.getActivity(
            getContext(),
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
