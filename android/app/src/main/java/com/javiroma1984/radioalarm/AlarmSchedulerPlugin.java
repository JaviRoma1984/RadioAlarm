package com.javiroma1984.radioalarm;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

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
@CapacitorPlugin(name = "AlarmScheduler")
public class AlarmSchedulerPlugin extends Plugin {

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

        call.resolve();
    }

    @PluginMethod
    public void cancelar(PluginCall call) {
        String id = call.getString("id");
        if (id == null) {
            call.reject("Falta \"id\"");
            return;
        }

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
