package com.el3bhasah.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;

import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        // Keep the WebView in the safe content area instead of drawing under
        // the phone status/navigation bars. This prevents header overlap on
        // notched, punch-hole and gesture-navigation devices.
        WindowCompat.setDecorFitsSystemWindows(window, true);
        window.setStatusBarColor(Color.rgb(11, 13, 16));
        window.setNavigationBarColor(Color.rgb(11, 13, 16));

        // Stable white system-bar icons. The in-app light/dark switch does
        // not modify the phone's status-bar presentation.
        int flags = window.getDecorView().getSystemUiVisibility();
        flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        window.getDecorView().setSystemUiVisibility(flags);
    }
}
