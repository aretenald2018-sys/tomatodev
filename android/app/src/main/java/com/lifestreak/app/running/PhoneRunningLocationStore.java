package com.lifestreak.app.running;

import android.location.Location;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import java.util.ArrayList;
import java.util.List;

public final class PhoneRunningLocationStore {
    private static final int MAX_POINTS = 25_000;
    private static final float MAX_ACCURACY_M = 100f;
    private static final double MAX_SPEED_MPS = 15.0;
    private static final long MAX_LOCATION_AGE_MS = 30_000L;

    private static final List<Point> points = new ArrayList<>();
    private static long startedAt = 0L;
    private static boolean tracking = false;
    private static boolean paused = false;

    private PhoneRunningLocationStore() {}

    public static synchronized void start(long requestedStartedAt) {
        points.clear();
        startedAt = requestedStartedAt > 0L ? requestedStartedAt : System.currentTimeMillis();
        tracking = true;
        paused = false;
    }

    public static synchronized void pause() {
        if (tracking) paused = true;
    }

    public static synchronized void resume() {
        if (tracking) paused = false;
    }

    public static synchronized void stop() {
        tracking = false;
        paused = false;
    }

    public static synchronized boolean isTracking() {
        return tracking;
    }

    public static synchronized boolean accept(Location location) {
        if (!tracking || paused || location == null || points.size() >= MAX_POINTS) return false;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S && location.isMock()) return false;
        if (!location.hasAccuracy() || location.getAccuracy() <= 0f || location.getAccuracy() > MAX_ACCURACY_M) return false;
        if (!Double.isFinite(location.getLatitude()) || !Double.isFinite(location.getLongitude())) return false;

        long now = System.currentTimeMillis();
        long timestamp = location.getTime() > 0L ? location.getTime() : now;
        long ageMs = now - timestamp;
        if (ageMs > MAX_LOCATION_AGE_MS || ageMs < -10_000L) return false;
        timestamp = Math.max(startedAt, Math.min(now, timestamp));

        Point previous = points.isEmpty() ? null : points.get(points.size() - 1);
        if (previous != null) {
            long elapsedMs = timestamp - previous.timestampMs;
            if (elapsedMs <= 0L) return false;
            float[] distance = new float[1];
            Location.distanceBetween(previous.lat, previous.lng, location.getLatitude(), location.getLongitude(), distance);
            double distanceM = distance[0];
            double allowanceM = Math.max(80.0, Math.max(previous.accuracy, location.getAccuracy()));
            if (distanceM > allowanceM && distanceM / (elapsedMs / 1000.0) > MAX_SPEED_MPS) return false;
        }

        points.add(new Point(
            timestamp,
            location.getLatitude(),
            location.getLongitude(),
            location.getAccuracy(),
            location.hasAltitude() ? location.getAltitude() : null,
            location.hasSpeed() ? location.getSpeed() : null,
            location.hasBearing() ? location.getBearing() : null
        ));
        return true;
    }

    public static synchronized JSObject status() {
        return snapshotAfter(points.size());
    }

    public static synchronized JSObject snapshotAfter(int requestedIndex) {
        int from = Math.max(0, Math.min(requestedIndex, points.size()));
        JSArray payloadPoints = new JSArray();
        for (int index = from; index < points.size(); index += 1) {
            Point point = points.get(index);
            JSObject json = new JSObject();
            json.put("index", index);
            json.put("ts", point.timestampMs);
            json.put("lat", point.lat);
            json.put("lng", point.lng);
            json.put("accuracy", point.accuracy);
            if (point.altitude != null) json.put("altitude", point.altitude);
            if (point.speed != null) json.put("speed", point.speed);
            if (point.bearing != null) json.put("bearing", point.bearing);
            payloadPoints.put(json);
        }
        JSObject result = new JSObject();
        result.put("tracking", tracking);
        result.put("paused", paused);
        result.put("startedAt", startedAt);
        result.put("nextIndex", points.size());
        result.put("pointCount", points.size());
        result.put("points", payloadPoints);
        return result;
    }

    private static final class Point {
        final long timestampMs;
        final double lat;
        final double lng;
        final float accuracy;
        final Double altitude;
        final Float speed;
        final Float bearing;

        Point(long timestampMs, double lat, double lng, float accuracy, Double altitude, Float speed, Float bearing) {
            this.timestampMs = timestampMs;
            this.lat = lat;
            this.lng = lng;
            this.accuracy = accuracy;
            this.altitude = altitude;
            this.speed = speed;
            this.bearing = bearing;
        }
    }
}
