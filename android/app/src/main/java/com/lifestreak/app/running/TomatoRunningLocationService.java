package com.lifestreak.app.running;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import com.lifestreak.app.MainActivity;

public class TomatoRunningLocationService extends Service implements LocationListener {
    public static final String ACTION_START = "com.lifestreak.app.running.START";
    public static final String ACTION_PAUSE = "com.lifestreak.app.running.PAUSE";
    public static final String ACTION_RESUME = "com.lifestreak.app.running.RESUME";
    public static final String ACTION_STOP = "com.lifestreak.app.running.STOP";
    private static final String CHANNEL_ID = "phone-running-location";
    private static final int NOTIFICATION_ID = 2101;

    private LocationManager locationManager;

    @Override
    public void onCreate() {
        super.onCreate();
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        ensureNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        if (ACTION_PAUSE.equals(action)) {
            PhoneRunningLocationStore.pause();
            stopLocationUpdates();
        } else if (ACTION_STOP.equals(action)) {
            PhoneRunningLocationStore.stop();
            stopLocationUpdates();
            stopForegroundCompat();
            stopSelf();
        } else if (ACTION_START.equals(action) || ACTION_RESUME.equals(action)) {
            PhoneRunningLocationStore.resume();
            startForegroundCompat();
            startLocationUpdates();
        } else if (PhoneRunningLocationStore.isTracking()) {
            startForegroundCompat();
            startLocationUpdates();
        } else {
            stopSelf();
        }
        return START_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        stopLocationUpdates();
        super.onDestroy();
    }

    @Override
    public void onLocationChanged(Location location) {
        PhoneRunningLocationStore.accept(location);
    }

    @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
    @Override public void onProviderEnabled(String provider) {}
    @Override public void onProviderDisabled(String provider) {}

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void startLocationUpdates() {
        if (!hasLocationPermission() || locationManager == null) return;
        stopLocationUpdates();
        try {
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1_000L, 2f, this);
            }
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 2_000L, 5f, this);
            }
        } catch (SecurityException ignored) {
            PhoneRunningLocationStore.pause();
        }
    }

    private void stopLocationUpdates() {
        if (locationManager == null) return;
        try {
            locationManager.removeUpdates(this);
        } catch (SecurityException ignored) {}
    }

    private void startForegroundCompat() {
        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void stopForegroundCompat() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE);
        else {
            @SuppressWarnings("deprecation")
            boolean ignored = stopForegroundLegacy();
        }
    }

    @SuppressWarnings("deprecation")
    private boolean stopForegroundLegacy() {
        stopForeground(true);
        return true;
    }

    private Notification buildNotification() {
        Intent openIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle("Tomato Farm 러닝")
            .setContentText("휴대폰 GPS로 이동 경로를 기록 중이에요")
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .build();
    }

    private void ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager.getNotificationChannel(CHANNEL_ID) == null) {
            manager.createNotificationChannel(new NotificationChannel(
                CHANNEL_ID,
                "러닝 위치 기록",
                NotificationManager.IMPORTANCE_LOW
            ));
        }
    }
}
