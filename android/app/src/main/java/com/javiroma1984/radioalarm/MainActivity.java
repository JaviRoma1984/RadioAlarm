package com.javiroma1984.radioalarm;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AlarmSchedulerPlugin.class);
        permitirMostrarSobreElBloqueo();
        super.onCreate(savedInstanceState);
    }

    /**
     * Sin esto, la notificación de pantalla completa de AlarmReceiver dispara
     * el intent pero la actividad no queda autorizada a dibujarse por encima
     * del bloqueo ni a encender la pantalla: el sistema la deja "en pausa"
     * detrás del bloqueo -audio de `<audio>` cortado, vibración y
     * temporizadores retrasados, todo lo que se vio al probarlo en un móvil
     * real- hasta que alguien desbloquea a mano. Es el mismo permiso que usan
     * las apps de llamada entrante, no algo específico de esta alarma.
     */
    private void permitirMostrarSobreElBloqueo() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );
        }
    }
}
