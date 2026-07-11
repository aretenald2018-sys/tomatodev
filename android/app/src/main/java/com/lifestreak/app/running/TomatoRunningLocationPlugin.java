package com.lifestreak.app.running;

import android.Manifest;
import android.content.Intent;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "TomatoRunningLocation",
    permissions = {
        @Permission(
            alias = "location",
            strings = { Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION }
        )
    }
)
public class TomatoRunningLocationPlugin extends Plugin {
    @PluginMethod
    public void startTracking(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "locationPermissionCallback");
            return;
        }
        startWithPermission(call);
    }

    @PermissionCallback
    private void locationPermissionCallback(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            call.reject("Precise location permission is required for running GPS");
            return;
        }
        startWithPermission(call);
    }

    private void startWithPermission(PluginCall call) {
        long startedAt = call.getLong("startedAt", System.currentTimeMillis());
        PhoneRunningLocationStore.start(getContext(), startedAt);
        startService(TomatoRunningLocationService.ACTION_START, true);
        call.resolve(PhoneRunningLocationStore.snapshotAfter(0));
    }

    @PluginMethod
    public void pauseTracking(PluginCall call) {
        PhoneRunningLocationStore.pause(getContext());
        startService(TomatoRunningLocationService.ACTION_PAUSE, false);
        call.resolve(PhoneRunningLocationStore.status());
    }

    @PluginMethod
    public void resumeTracking(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            call.reject("Precise location permission is required for running GPS");
            return;
        }
        PhoneRunningLocationStore.resume(getContext());
        startService(TomatoRunningLocationService.ACTION_RESUME, true);
        call.resolve(PhoneRunningLocationStore.status());
    }

    @PluginMethod
    public void stopTracking(PluginCall call) {
        PhoneRunningLocationStore.stop(getContext());
        JSObject result = PhoneRunningLocationStore.snapshotAfter(call.getInt("afterIndex", 0));
        startService(TomatoRunningLocationService.ACTION_STOP, false);
        call.resolve(result);
    }

    @PluginMethod
    public void getUpdates(PluginCall call) {
        PhoneRunningLocationStore.restore(getContext());
        call.resolve(PhoneRunningLocationStore.snapshotAfter(call.getInt("afterIndex", 0)));
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        PhoneRunningLocationStore.restore(getContext());
        call.resolve(PhoneRunningLocationStore.status());
    }

    private void startService(String action, boolean foreground) {
        Intent intent = new Intent(getContext(), TomatoRunningLocationService.class).setAction(action);
        if (foreground) ContextCompat.startForegroundService(getContext(), intent);
        else getContext().startService(intent);
    }
}
