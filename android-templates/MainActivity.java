package com.kulswamini.prathisthan;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

/**
 * MainActivity for कुलस्वामिनी प्रतिष्ठान Android App
 * This loads the website in a WebView
 */
public class MainActivity extends BridgeActivity {
  
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    
    // Configure WebView settings for optimal performance
    WebSettings webSettings = this.bridge.getWebView().getSettings();
    
    // Enable JavaScript
    webSettings.setJavaScriptEnabled(true);
    
    // Enable DOM storage (for localStorage, sessionStorage)
    webSettings.setDomStorageEnabled(true);
    
    // Enable database storage
    webSettings.setDatabaseEnabled(true);
    
    // Enable zoom controls (optional)
    webSettings.setSupportZoom(true);
    webSettings.setBuiltInZoomControls(false);
    webSettings.setDisplayZoomControls(false);
    
    // Enable caching for better offline experience
    webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
    webSettings.setAppCacheEnabled(true);
    
    // Allow file access
    webSettings.setAllowFileAccess(true);
    webSettings.setAllowContentAccess(true);
    
    // Mixed content (HTTP + HTTPS)
    webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    
    // Better text rendering
    webSettings.setTextZoom(100);
    
    // Enable hardware acceleration
    this.bridge.getWebView().setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null);
  }
  
  @Override
  public void onBackPressed() {
    // Handle back button - go back in WebView history if possible
    if (this.bridge.getWebView().canGoBack()) {
      this.bridge.getWebView().goBack();
    } else {
      super.onBackPressed();
    }
  }
}
