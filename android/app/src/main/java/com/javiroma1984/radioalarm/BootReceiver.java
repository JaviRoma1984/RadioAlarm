package com.javiroma1984.radioalarm;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * AlarmManager pierde todas las alarmas programadas al reiniciar el
 * dispositivo. La lista de alarmas vive en el localStorage del WebView, no
 * accesible desde aquí, así que la forma de resincronizar es dejar que sea
 * la propia app la que lo haga: este receiver solo la abre después del
 * arranque, y js/nativo.js —que ya reprograma todo al iniciar la app en
 * cualquier circunstancia— hace el resto solo.
 *
 * Nota: algunos fabricantes (Oppo/ColorOS entre ellos) restringen el
 * autoarranque de apps tras el reinicio salvo que el usuario lo permita a
 * mano en un ajuste propio del sistema; si las alarmas no sobreviven a un
 * reinicio en un móvil así, es ahí donde hay que mirar, no en este código.
 */
public class BootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) return;

        Intent intentApp = new Intent(context, MainActivity.class);
        intentApp.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intentApp);
    }
}
