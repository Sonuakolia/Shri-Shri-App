package com.shrishri.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;

    private static final int FILE_CHOOSER = 1001;
    private static final int PERMISSION_REQUEST = 2001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();

        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);

        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        webView.addJavascriptInterface(
                new AndroidInterface(),
                "Android"
        );

        webView.addJavascriptInterface(
                new AndroidShare(),
                "AndroidShare"
        );

        webView.setWebViewClient(new WebViewClient());

        webView.setWebChromeClient(new WebChromeClient() {

            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams
            ) {

                if (fileCallback != null) {
                    fileCallback.onReceiveValue(null);
                }

                fileCallback = filePathCallback;

                try {

                    Intent intent = fileChooserParams.createIntent();

                    intent.addCategory(Intent.CATEGORY_OPENABLE);

                    startActivityForResult(
                            intent,
                            FILE_CHOOSER
                    );

                    return true;

                } catch (Exception e) {

                    fileCallback = null;

                    return false;
                }
            }

            @Override
            public void onPermissionRequest(
                    final PermissionRequest request
            ) {

                runOnUiThread(() -> {

                    if (
                            checkSelfPermission(Manifest.permission.CAMERA)
                                    == PackageManager.PERMISSION_GRANTED
                                    &&
                            checkSelfPermission(Manifest.permission.RECORD_AUDIO)
                                    == PackageManager.PERMISSION_GRANTED
                    ) {

                        request.grant(request.getResources());

                    } else {

                        requestPermissions(
                                new String[]{
                                        Manifest.permission.CAMERA,
                                        Manifest.permission.RECORD_AUDIO
                                },
                                PERMISSION_REQUEST
                        );

                    }

                });
            }
        });

        requestAppPermissions();

        webView.loadUrl(
                "file:///android_asset/index.html"
        );
    }

    private void requestAppPermissions() {

        if (android.os.Build.VERSION.SDK_INT >= 23) {

            if (
                    checkSelfPermission(Manifest.permission.CAMERA)
                            != PackageManager.PERMISSION_GRANTED
                            ||
                    checkSelfPermission(Manifest.permission.RECORD_AUDIO)
                            != PackageManager.PERMISSION_GRANTED
            ) {

                requestPermissions(
                        new String[]{
                                Manifest.permission.CAMERA,
                                Manifest.permission.RECORD_AUDIO
                        },
                        PERMISSION_REQUEST
                );

            }
        }
    }

    @Override
    protected void onActivityResult(
            int requestCode,
            int resultCode,
            Intent data
    ) {

        super.onActivityResult(
                requestCode,
                resultCode,
                data
        );

        if (
                requestCode == FILE_CHOOSER
                        &&
                fileCallback != null
        ) {

            Uri[] result =
                    WebChromeClient.FileChooserParams
                            .parseResult(
                                    resultCode,
                                    data
                            );

            fileCallback.onReceiveValue(result);

            fileCallback = null;
        }
    }

    public class AndroidShare {

        @JavascriptInterface
        public void share(String text) {

            Intent sendIntent =
                    new Intent(Intent.ACTION_SEND);

            sendIntent.putExtra(
                    Intent.EXTRA_TEXT,
                    text
            );

            sendIntent.setType("text/plain");

            startActivity(
                    Intent.createChooser(
                            sendIntent,
                            "Share via"
                    )
            );
        }
    }

    public class AndroidInterface {

        @JavascriptInterface
        public void openSettings() {

            Intent intent =
                    new Intent(
                            Settings.ACTION_APPLICATION_DETAILS_SETTINGS
                    );

            intent.setData(
                    Uri.parse(
                            "package:" + getPackageName()
                    )
            );

            startActivity(intent);
        }
    }

    @Override
    public void onBackPressed() {

        if (
                webView != null
                        &&
                webView.canGoBack()
        ) {

            webView.goBack();

        } else {

            super.onBackPressed();
        }
    }
}
