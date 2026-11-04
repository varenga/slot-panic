package es.pnyk.slot;

import android.content.pm.ActivityInfo;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/*
 * Una partida a dos no gira (APP.md §5): en vertical se juega solo. La WebView
 * no admite screen.orientation.lock, así que lo hace la actividad. Sin bloquear,
 * lo mismo que pide el manifest: fullUser.
 */
@CapacitorPlugin(name = "Giro")
public class Giro extends Plugin {
    @PluginMethod
    public void bloquear(PluginCall call) {
        boolean bloquear = Boolean.TRUE.equals(call.getBoolean("bloquear", false));
        getActivity().runOnUiThread(() -> getActivity().setRequestedOrientation(
            bloquear ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE : ActivityInfo.SCREEN_ORIENTATION_FULL_USER));
        call.resolve();
    }
}
