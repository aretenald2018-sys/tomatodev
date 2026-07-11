package com.lifestreak.app.running;

import android.content.Context;
import android.location.Location;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONObject;

public final class PhoneRunningLocationStore {
    private static final String PREFS_NAME = "tomato_running_location";
    private static final String KEY_STATE = "state";
    private static final String POINTS_FILE_NAME = "running-location-points.jsonl";
    private static final int VERSION = 1;
    private static final int MAX_POINTS = 25_000;
    private static final float MAX_ACCURACY_M = 35f;
    private static final double MAX_RUNNING_SPEED_MPS = 15.0;
    private static final long MAX_LOCATION_AGE_MS = 30_000L;

    private static final List<Point> points = new ArrayList<>();
    private static long startedAt = 0L;
    private static boolean tracking = false;
    private static boolean paused = false;
    private static boolean restored = false;

    private PhoneRunningLocationStore() {}

    public static synchronized void restore(Context context) {
        if (restored || context == null) return;
        restored = true;
        String raw = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(KEY_STATE, null);
        if (raw == null || raw.trim().isEmpty()) return;
        try {
            JSONObject state = new JSONObject(raw);
            if (state.optInt("version", 0) != VERSION || !state.optBoolean("tracking", false)) {
                clearPersistence(context);
                return;
            }
            startedAt = Math.max(0L, state.optLong("startedAt", 0L));
            tracking = startedAt > 0L;
            paused = state.optBoolean("paused", false);
            points.clear();
            readPersistedPoints(context);
            if (!tracking) clearPersistence(context);
        } catch (Exception ignored) {
            points.clear();
            startedAt = 0L;
            tracking = false;
            paused = false;
            clearPersistence(context);
        }
    }

    public static synchronized void start(Context context, long requestedStartedAt) {
        start(requestedStartedAt);
        restored = true;
        if (context == null) return;
        deletePointsFile(context);
        persist(context);
    }

    public static synchronized void start(long requestedStartedAt) {
        points.clear();
        startedAt = requestedStartedAt > 0L ? requestedStartedAt : System.currentTimeMillis();
        tracking = true;
        paused = false;
    }

    public static synchronized void pause(Context context) {
        restore(context);
        pause();
        persist(context);
    }

    public static synchronized void pause() {
        if (tracking) paused = true;
    }

    public static synchronized void resume(Context context) {
        restore(context);
        resume();
        persist(context);
    }

    public static synchronized void resume() {
        if (tracking) paused = false;
    }

    public static synchronized void stop(Context context) {
        restore(context);
        stop();
        clearPersistence(context);
    }

    public static synchronized void stop() {
        tracking = false;
        paused = false;
    }

    public static synchronized boolean isTracking() {
        return tracking;
    }

    public static synchronized boolean accept(Context context, Location location) {
        boolean accepted = accept(location);
        if (accepted && context != null) {
            appendLastPoint(context);
            persist(context);
        }
        return accepted;
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
            double inferredSpeedMps = distanceM / (elapsedMs / 1000.0);
            if (!Double.isFinite(inferredSpeedMps) || inferredSpeedMps > MAX_RUNNING_SPEED_MPS) return false;
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

    public static synchronized void persist(Context context) {
        if (context == null) return;
        if (!tracking) {
            clearPersistence(context);
            return;
        }
        try {
            JSONObject state = new JSONObject()
                .put("version", VERSION)
                .put("startedAt", startedAt)
                .put("tracking", tracking)
                .put("paused", paused)
                .put("pointCount", points.size());
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_STATE, state.toString())
                .apply();
        } catch (Exception ignored) {}
    }

    public static synchronized void clearPersistence(Context context) {
        if (context == null) return;
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove(KEY_STATE)
            .apply();
        deletePointsFile(context);
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

    private static void readPersistedPoints(Context context) {
        File file = pointsFile(context);
        if (!file.isFile()) return;
        try (
            BufferedReader reader = new BufferedReader(
                new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8)
            )
        ) {
            String line;
            while ((line = reader.readLine()) != null && points.size() < MAX_POINTS) {
                Point point = Point.fromJson(line);
                if (point != null && point.timestampMs >= startedAt) points.add(point);
            }
        } catch (Exception ignored) {
            points.clear();
        }
    }

    private static void appendLastPoint(Context context) {
        if (points.isEmpty()) return;
        Point point = points.get(points.size() - 1);
        try (
            BufferedWriter writer = new BufferedWriter(
                new OutputStreamWriter(new FileOutputStream(pointsFile(context), true), StandardCharsets.UTF_8)
            )
        ) {
            writer.write(point.toJson().toString());
            writer.newLine();
        } catch (Exception ignored) {}
    }

    private static File pointsFile(Context context) {
        return new File(context.getFilesDir(), POINTS_FILE_NAME);
    }

    private static void deletePointsFile(Context context) {
        File file = pointsFile(context);
        if (file.exists() && !file.delete()) {
            file.deleteOnExit();
        }
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

        JSONObject toJson() throws Exception {
            JSONObject json = new JSONObject()
                .put("ts", timestampMs)
                .put("lat", lat)
                .put("lng", lng)
                .put("accuracy", accuracy);
            if (altitude != null) json.put("altitude", altitude);
            if (speed != null) json.put("speed", speed);
            if (bearing != null) json.put("bearing", bearing);
            return json;
        }

        static Point fromJson(String raw) {
            try {
                JSONObject json = new JSONObject(raw);
                long timestampMs = json.optLong("ts", -1L);
                double lat = json.optDouble("lat", Double.NaN);
                double lng = json.optDouble("lng", Double.NaN);
                double accuracy = json.optDouble("accuracy", Double.NaN);
                if (timestampMs < 0L ||
                    !Double.isFinite(lat) ||
                    !Double.isFinite(lng) ||
                    !Double.isFinite(accuracy) ||
                    accuracy <= 0.0 ||
                    accuracy > MAX_ACCURACY_M) {
                    return null;
                }
                Double altitude = json.has("altitude") && !json.isNull("altitude")
                    ? json.optDouble("altitude")
                    : null;
                if (altitude != null && !Double.isFinite(altitude)) altitude = null;
                Float speed = json.has("speed") && !json.isNull("speed")
                    ? (float) json.optDouble("speed")
                    : null;
                if (speed != null && !Float.isFinite(speed)) speed = null;
                Float bearing = json.has("bearing") && !json.isNull("bearing")
                    ? (float) json.optDouble("bearing")
                    : null;
                if (bearing != null && !Float.isFinite(bearing)) bearing = null;
                return new Point(timestampMs, lat, lng, (float) accuracy, altitude, speed, bearing);
            } catch (Exception ignored) {
                return null;
            }
        }
    }
}
