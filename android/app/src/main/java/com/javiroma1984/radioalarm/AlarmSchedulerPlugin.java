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
import android.util.Base64;
import android.util.Log;

import java.io.File;
import java.io.FileOutputStream;
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

    /**
     * `tipoSonido`/`tono`/`cancionId`/`emisoraUrl` van directos como extras
     * del `PendingIntent` de disparo (ver `crearPendingIntentDisparo`): así
     * `AlarmService` ya sabe qué reproducir sin depender de que la WebView
     * esté viva para preguntárselo al JS en ese momento. Si la fuente es una
     * canción, el archivo tiene que estar ya exportado con
     * `guardarAudioCancion` antes de llamar aquí —lo hace `js/nativo.js`—.
     */
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

        String tipoSonido = call.getString("tipoSonido", "tono");
        String tono = call.getString("tono");
        String cancionId = call.getString("cancionId");
        String emisoraUrl = call.getString("emisoraUrl");
        boolean ascendente = call.getBoolean("ascendente", true);

        AlarmManager.AlarmClockInfo info = new AlarmManager.AlarmClockInfo(cuando, crearPendingIntentMostrar());
        gestor.setAlarmClock(info, crearPendingIntentDisparo(id, tipoSonido, tono, cancionId, emisoraUrl, ascendente));

        String mensaje = "programar id=" + id + " cuando=" + new Date(cuando) + " tipo=" + tipoSonido
            + " (alarmas exactas=" + puedeProgramarExactas()
            + ", exención batería=" + tieneExencionBateriaConcedida()
            + ", pantalla completa=" + puedeUsarPantallaCompleta()
            + ", superposición=" + puedeSuperponerse() + ")";
        Log.i(TAG, mensaje);
        Registro.agregar(getContext(), mensaje);

        call.resolve();
    }

    /**
     * Copia el audio de una canción elegida como alarma a almacenamiento
     * interno, para que `AlarmService` la pueda reproducir sin la WebView
     * (el archivo original vive en el IndexedDB de la propia WebView, no
     * accesible desde Java). `js/nativo.js` llama a esto una vez por cada
     * canción antes de programarla como alarma.
     */
    @PluginMethod
    public void guardarAudioCancion(PluginCall call) {
        String id = call.getString("id");
        String base64 = call.getString("base64");

        if (id == null || base64 == null) {
            call.reject("Faltan datos: se necesitan \"id\" y \"base64\"");
            return;
        }

        try {
            byte[] datos = Base64.decode(base64, Base64.DEFAULT);
            File carpeta = new File(getContext().getFilesDir(), "canciones");
            carpeta.mkdirs();

            try (FileOutputStream salida = new FileOutputStream(new File(carpeta, id))) {
                salida.write(datos);
            }

            call.resolve();
        } catch (Exception excepcion) {
            call.reject("No se pudo guardar el audio de la canción", excepcion);
        }
    }

    /**
     * La llama el JS en cuanto decide sonar por su cuenta —tanto si la
     * alarma la había lanzado la notificación nativa como si el propio
     * motor JS la detectó con la app abierta—, para que `AlarmService` no
     * siga sonando en paralelo.
     */
    @PluginMethod
    public void detenerSonidoNativo(PluginCall call) {
        Intent intent = new Intent(getContext(), AlarmService.class);
        intent.setAction(AlarmService.ACCION_DETENER);
        getContext().startService(intent);
        call.resolve();
    }

    /**
     * El texto acumulado por Registro.
     *
     * La app ya no lo enseña por ninguna pantalla —el panel de Diagnóstico de
     * Opciones de sonido se quitó, porque el registro es para depurar, no para
     * el usuario—; se lee de fuera, con
     * `adb shell run-as com.javiroma1984.radioalarm cat shared_prefs/radioalarm-registro.xml`.
     * Estos dos métodos se quedan como la forma de sacarlo sin depender de que
     * la build sea depurable, que es lo que hace posible ese `run-as`.
     */
    @PluginMethod
    public void leerRegistro(PluginCall call) {
        JSObject resultado = new JSObject();
        resultado.put("texto", Registro.leer(getContext()));
        call.resolve(resultado);
    }

    @PluginMethod
    public void borrarRegistro(PluginCall call) {
        Registro.borrar(getContext());
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
     * «Mostrar sobre otras aplicaciones» (`SYSTEM_ALERT_WINDOW`).
     *
     * Es lo que deja a `AlarmService` abrir la pantalla de alarma con el móvil
     * **desbloqueado y en uso**. Con la pantalla bloqueada no hace falta: ahí
     * la notificación de pantalla completa la abre el propio sistema. Pero
     * desbloqueado Android la degrada a notificación flotante, y entonces el
     * `startActivity` del servicio se topa con las restricciones de arranque
     * de actividades en segundo plano —en logcat aparece como
     * `Background activity launch blocked!`, mientras que `startActivity` no
     * llega a lanzar ninguna excepción, así que desde Java parece que ha ido
     * bien—. Tener este permiso es una de las exenciones oficiales de esa
     * restricción.
     *
     * Sin él la alarma no se queda muda —suena igual—, pero la pantalla de
     * alarma no se abre sola y solo aparece la notificación, que desde que se
     * le quitó el botón «Descartar» ya no sirve para pararla: habría que abrir
     * la app a mano. Por eso este permiso entra en el flujo junto a los demás,
     * y no como un extra opcional.
     */
    @PluginMethod
    public void tienePermisoSuperposicion(PluginCall call) {
        JSObject resultado = new JSObject();
        resultado.put("concedido", puedeSuperponerse());
        call.resolve(resultado);
    }

    @PluginMethod
    public void solicitarPermisoSuperposicion(PluginCall call) {
        if (!puedeSuperponerse()) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }

        call.resolve();
    }

    private boolean puedeSuperponerse() {
        return Settings.canDrawOverlays(getContext());
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
     * El id que lanzó la app, a la espera de que el JS lo recoja.
     *
     * `AlarmService` abre la app por dos caminos a la vez —su `startActivity`
     * directo y el `setFullScreenIntent` de su notificación—, y el segundo
     * llega como `onNewIntent` mientras el JS que arrancó el primero todavía
     * se está cargando. Sin guardarlo aquí, ese id se perdía por los dos
     * lados a la vez: el evento se emitía sin ningún oyente registrado
     * todavía (y Capacitor lo descarta), y el `removeExtra` de más abajo
     * borraba el dato que `comprobarLanzamiento` iba a leer un instante
     * después. El resultado era la app abriéndose en su pantalla normal, con
     * la alarma sonando de fondo y sin forma de pararla.
     */
    private String idPendiente;

    /** Cuándo se guardó `idPendiente`; ver `VALIDEZ_PENDIENTE_MS`. */
    private long idPendienteEn;

    /**
     * Cuánto vale un `idPendiente` sin consumir. Si el JS ya recogió el id
     * por el evento, el pendiente se queda ahí sin que nadie lo borre; sin
     * este límite, una recarga posterior del WebView lo leería y volvería a
     * abrir la pantalla de una alarma descartada hace rato. Un minuto cubre
     * de sobra el hueco entre que la actividad se crea y su JS arranca.
     */
    private static final long VALIDEZ_PENDIENTE_MS = 60000;

    /**
     * Si la app se ha abierto porque una notificación de alarma la lanzó
     * (pantalla bloqueada o app cerrada), devuelve el id de esa alarma y lo
     * consume: una llamada posterior ya no lo repite, así que al pasar a
     * segundo plano y reabrir la app "a mano" no se vuelve a disparar sola.
     *
     * Mira primero `idPendiente` (lo que dejó `handleOnNewIntent`) y solo
     * después el extra del intent, que es el camino del arranque en frío.
     */
    @PluginMethod
    public void comprobarLanzamiento(PluginCall call) {
        JSObject resultado = new JSObject();
        String idAlarma = null;

        if (idPendiente != null && System.currentTimeMillis() - idPendienteEn < VALIDEZ_PENDIENTE_MS) {
            idAlarma = idPendiente;
        }
        idPendiente = null;

        if (idAlarma == null && getActivity() != null && getActivity().getIntent() != null) {
            idAlarma = getActivity().getIntent().getStringExtra("idAlarma");
            getActivity().getIntent().removeExtra("idAlarma");
        }

        if (idAlarma != null) {
            Registro.agregar(getContext(), "comprobarLanzamiento: la app arrancó por la alarma id=" + idAlarma);
        }

        resultado.put("idAlarma", idAlarma);
        call.resolve(resultado);
    }

    /**
     * La actividad ya existía y una alarma nativa acaba de lanzarla de nuevo.
     * Puede ser la app que estaba abierta de verdad, o —lo más habitual— el
     * segundo de los dos lanzamientos de `AlarmService` sobre una actividad
     * que acaba de crearse y cuyo JS aún está arrancando (ver `idPendiente`).
     */
    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);

        String idAlarma = intent.getStringExtra("idAlarma");
        if (idAlarma == null) return;

        Registro.agregar(getContext(), "handleOnNewIntent: alarma relanzada con la app abierta id=" + idAlarma);
        intent.removeExtra("idAlarma");
        idPendiente = idAlarma;
        idPendienteEn = System.currentTimeMillis();

        JSObject datos = new JSObject();
        datos.put("idAlarma", idAlarma);
        // Retenido hasta que alguien lo consuma: así el evento sobrevive a
        // que el oyente del JS se registre después de haberlo emitido.
        notifyListeners("alarmaLanzada", datos, true);
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

    /**
     * El broadcast que AlarmManager dispara a la hora programada.
     *
     * Los datos de sonido son opcionales (`null` al cancelar, donde no hace
     * falta): `AlarmManager.cancel(PendingIntent)` compara por componente y
     * código de solicitud, no por los extras del `Intent`, así que un
     * `PendingIntent` "vacío" con el mismo id cancela igual el que se
     * programó con los datos completos.
     */
    private PendingIntent crearPendingIntentDisparo(
        String id, String tipoSonido, String tono, String cancionId, String emisoraUrl, boolean ascendente
    ) {
        Intent intent = new Intent(getContext(), AlarmReceiver.class);
        intent.putExtra("idAlarma", id);
        if (tipoSonido != null) intent.putExtra("tipoSonido", tipoSonido);
        if (tono != null) intent.putExtra("tono", tono);
        if (cancionId != null) intent.putExtra("cancionId", cancionId);
        if (emisoraUrl != null) intent.putExtra("emisoraUrl", emisoraUrl);
        intent.putExtra("ascendente", ascendente);

        return PendingIntent.getBroadcast(
            getContext(),
            id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private PendingIntent crearPendingIntentDisparo(String id) {
        return crearPendingIntentDisparo(id, null, null, null, null, true);
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
