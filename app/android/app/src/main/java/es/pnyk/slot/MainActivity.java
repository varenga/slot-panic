package es.pnyk.slot;

import android.os.Bundle;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

/*
 * Slot Panic a pantalla completa (APP.md §5.4): la barra de estado y la de
 * navegación le quitan un trozo al circuito (en horizontal) o a la lupa (en
 * vertical). Se esconden las dos; un deslizamiento desde el borde las enseña
 * un momento y se vuelven a esconder solas.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        pantallaCompleta();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) pantallaCompleta();
    }

    private void pantallaCompleta() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controlador =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controlador.hide(WindowInsetsCompat.Type.systemBars());
        controlador.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
