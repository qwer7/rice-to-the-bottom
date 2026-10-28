package com.racetothebottom.tv;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.io.IOException;
import java.io.File;
import java.io.FileWriter;
import java.net.URL;
import java.net.HttpURLConnection;
import android.util.Log;
import android.webkit.WebChromeClient;
import android.webkit.ConsoleMessage;

public final class MainActivity extends Activity {
    private static final String APP_HOST = "race-to-the-bottom-36n.pages.dev";
    private static final String SITE = "https://" + APP_HOST + "/";
    private WebView web;
    private String currentUrl;

    private synchronized void diagnostic(String message) {
        Log.i("RaceTV",message);
        File directory = getExternalFilesDir(null);
        if (directory == null) return;
        File report = new File(directory,"connection-check.txt");
        try (FileWriter writer = new FileWriter(report,report.length() < 65536)) {
            writer.write(System.currentTimeMillis() + " " + message + "\n");
        } catch (IOException ignored) { }
    }
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        diagnostic("App 1.6 started");
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        immersive();
        openBoard();
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL("https://iqtaucnbzxwrpoaohtkx.supabase.co/auth/v1/health").openConnection();
                connection.setConnectTimeout(10000); connection.setReadTimeout(10000);
                diagnostic("Native Supabase HTTPS status: " + connection.getResponseCode());
            } catch (Exception e) { diagnostic("Native Supabase HTTPS failed: " + e.getClass().getSimpleName()); }
            finally { if (connection != null) connection.disconnect(); }
        },"RaceTV-network-check").start();
    }
    private void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }
    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) immersive();
    }
    private int dp(int value) { return (int)(value * getResources().getDisplayMetrics().density); }
    private LinearLayout panel() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(dp(48), dp(24), dp(48), dp(24));
        root.setBackgroundColor(Color.rgb(19, 25, 33));
        setContentView(root);
        return root;
    }
    private void text(LinearLayout root, String value, int size, int color) {
        TextView label = new TextView(this);
        label.setText(value); label.setTextSize(size); label.setTextColor(color);
        label.setGravity(Gravity.CENTER); label.setPadding(0, dp(8), 0, dp(8));
        root.addView(label);
    }
    private void button(LinearLayout root, String title, Runnable action) {
        Button button = new Button(this);
        button.setText(title); button.setTextSize(18); button.setAllCaps(false);
        LinearLayout.LayoutParams layout = new LinearLayout.LayoutParams(dp(360), dp(56));
        layout.topMargin = dp(12); root.addView(button, layout);
        button.setOnClickListener(v -> action.run());
    }
    private void destroyWeb() {
        if (web != null) { web.stopLoading(); web.destroy(); web = null; }
    }
    private boolean allowed(Uri uri) {
        return "https".equals(uri.getScheme()) && APP_HOST.equals(uri.getHost());
    }
    private void openBoard() {
        destroyWeb();
        currentUrl = SITE + "?screen=tv";
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(19,25,33));
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUseWideViewPort(true); settings.setLoadWithOverviewMode(true);
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage message) {
                if (message.message().startsWith("RaceTV:")) diagnostic(message.message());
                else if (message.messageLevel() == ConsoleMessage.MessageLevel.ERROR) Log.e("RaceTV",message.message());
                return true;
            }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) { diagnostic("Website loaded"); }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return !allowed(request.getUrl()); }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) { return !allowed(Uri.parse(url)); }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame() && view == web) { diagnostic("Main frame load failed: " + error.getErrorCode()); view.post(() -> { if (view == web) connectionError(); }); }
            }
        });
        setContentView(web); web.setFocusable(true); web.setFocusableInTouchMode(true);
        web.requestFocus(); web.loadUrl(currentUrl); immersive();
    }
    private void connectionError() {
        destroyWeb();
        LinearLayout root = panel();
        text(root, "Не удалось загрузить экран доски", 28, Color.WHITE);
        text(root, "Проверьте интернет на телевизоре и повторите подключение.\nЕсли используется VPN, попробуйте без него.", 18, Color.LTGRAY);
        button(root, "Повторить", () -> openBoard());
    }
    private void menu() {
        new AlertDialog.Builder(this).setTitle("Доска результатов")
            .setItems(new String[]{"Обновить доску", "Выйти из приложения"}, (dialog, which) -> {
                if (which == 0) openBoard();
                else finish();
            }).setNegativeButton("Продолжить", null).show();
    }
    @Override public void onBackPressed() { if (web != null) menu(); else super.onBackPressed(); }
    @Override public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_MENU && web != null) { menu(); return true; }
        return super.onKeyDown(keyCode, event);
    }
    @Override protected void onDestroy() { destroyWeb(); super.onDestroy(); }
}
