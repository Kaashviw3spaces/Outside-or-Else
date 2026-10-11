package com.outsideorelse.game;

import android.Manifest;
import android.content.Intent;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import androidx.core.location.LocationManagerCompat;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.util.ArrayList;

@CapacitorPlugin(name="PetLocation", permissions={@Permission(alias="location", strings={Manifest.permission.ACCESS_COARSE_LOCATION})})
public class PetLocationPlugin extends Plugin {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private PluginCall active;
    private LocationManager manager;
    private LocationListener listener;
    private Runnable timeout;
    @PluginMethod public void current(PluginCall call) {
        if (getPermissionState("location") == PermissionState.GRANTED) locate(call);
        else if (getPermissionState("location") == PermissionState.DENIED) call.reject("Location permission is blocked. Open Android app settings to allow approximate location.", "BLOCKED");
        else requestPermissionForAlias("location", call, "permissionResult");
    }
    @PermissionCallback private void permissionResult(PluginCall call) {
        if (getPermissionState("location") == PermissionState.GRANTED) locate(call);
        else call.reject("Location permission wasn't granted. You can retry or continue without it.", getPermissionState("location") == PermissionState.DENIED ? "BLOCKED" : "DENIED");
    }
    private void locate(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (active != null) { call.reject("Location is already being requested.", "BUSY"); return; }
            manager = (LocationManager)getContext().getSystemService(android.content.Context.LOCATION_SERVICE);
            if (manager == null || !LocationManagerCompat.isLocationEnabled(manager)) { call.reject("Turn on your phone's Location service, then try again.", "SERVICES_DISABLED"); return; }
            active = call;
            listener = new LocationListener() {
                @Override public void onLocationChanged(Location location) {
                    if (active == null) return;
                    JSObject result = new JSObject(); result.put("latitude", location.getLatitude()); result.put("longitude", location.getLongitude());
                    PluginCall pending = active; cleanup(); pending.resolve(result);
                }
                @Override public void onProviderDisabled(String provider) {
                    if (active != null && !LocationManagerCompat.isLocationEnabled(manager)) fail("Turn on your phone's Location service, then retry.", "SERVICES_DISABLED");
                }
                @Override public void onProviderEnabled(String provider) {}
                @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
            };
            timeout = () -> fail("Location took too long. Move near a window, check Location services, and retry.", "TIMEOUT");
            handler.postDelayed(timeout, 15000);
            try {
                ArrayList<String> providers = new ArrayList<>(manager.getProviders(true));
                providers.remove(LocationManager.PASSIVE_PROVIDER);
                if (android.os.Build.VERSION.SDK_INT < 31) providers.remove(LocationManager.GPS_PROVIDER);
                if (providers.isEmpty()) { fail("No location provider is available. Enable Location services and retry.", "UNAVAILABLE"); return; }
                // Approximate foreground location only; no precise/background permission.
                for (String provider : providers) manager.requestLocationUpdates(provider, 0, 0, listener, Looper.getMainLooper());
            } catch (SecurityException e) { fail("Location permission was revoked. Try again or open app settings.", "DENIED"); }
            catch (Exception e) { fail("Location is unavailable. Check phone Location settings and retry.", "UNAVAILABLE"); }
        });
    }
    private void fail(String message, String code) { PluginCall pending = active; cleanup(); if (pending != null) pending.reject(message, code); }
    private void cleanup() {
        if (timeout != null) handler.removeCallbacks(timeout);
        if (manager != null && listener != null) try { manager.removeUpdates(listener); } catch (Exception ignored) {}
        active = null; listener = null; timeout = null;
    }
    @PluginMethod public void openSettings(PluginCall call) {
        try { getActivity().startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName()))); call.resolve(); }
        catch (Exception e) { call.reject("Could not open Android app settings."); }
    }
    @Override protected void handleOnDestroy() { handler.post(() -> fail("Location request ended. Please retry.", "CANCELLED")); }
}
