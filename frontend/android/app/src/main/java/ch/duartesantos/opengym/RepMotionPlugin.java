package ch.duartesantos.opengym;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Opt-in foreground motion stream for the beta guided-machine repetition counter.
 *
 * A device may omit TYPE_LINEAR_ACCELERATION (a synthesized sensor). In that
 * case use TYPE_ACCELEROMETER, remove gravity with a timestamp-aware low-pass
 * filter and publish the resulting linear component. No runtime permissions,
 * network calls or persistent motion data are required.
 */
@CapacitorPlugin(name = "RepMotion")
public class RepMotionPlugin extends Plugin implements SensorEventListener {
    private SensorManager manager;
    private Sensor sensor;
    private boolean rawAccelerometer = false;
    private volatile boolean listening = false;
    private long lastEmittedNs = 0;
    private final float[] gravity = new float[3];
    private boolean hasGravity = false;
    private long gravityTimeNs = 0;

    @Override
    public void load() {
        super.load();
        Context ctx = getContext();
        if (ctx == null) return;
        manager = (SensorManager) ctx.getSystemService(Context.SENSOR_SERVICE);
        chooseSensor();
    }

    // Usually a real/virtual linear-acceleration sensor exists. Otherwise the
    // built-in accelerometer is widely available, including on budget phones.
    private void chooseSensor() {
        sensor = null;
        rawAccelerometer = false;
        if (manager == null) return;
        sensor = manager.getDefaultSensor(Sensor.TYPE_LINEAR_ACCELERATION);
        if (sensor == null) {
            sensor = manager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
            rawAccelerometer = sensor != null;
        }
    }

    @PluginMethod
    public void available(PluginCall call) {
        if (sensor == null) chooseSensor();
        JSObject result = new JSObject();
        result.put("available", sensor != null);
        result.put("mode", sensor == null ? "none" : (rawAccelerometer ? "accelerometer" : "linear"));
        result.put("sensorName", sensor == null ? "" : sensor.getName());
        result.put("permissionRequired", false);
        result.put("sampleHz", 25);
        if (sensor == null) result.put("reason", "Weder linearer Beschleunigungssensor noch Accelerometer verfügbar.");
        call.resolve(result);
    }

    @PluginMethod
    public synchronized void start(PluginCall call) {
        if (sensor == null) chooseSensor();
        if (manager == null || sensor == null) {
            call.reject("Kein Beschleunigungssensor verfügbar. Bitte Sensordiagnose öffnen.");
            return;
        }
        stopSampling();
        lastEmittedNs = 0;
        hasGravity = false;
        gravityTimeNs = 0;
        // About 25 Hz; HIGH_SAMPLING_RATE_SENSORS is neither needed nor wanted.
        listening = manager.registerListener(this, sensor, 40_000);
        if (!listening) call.reject("Sensor konnte nicht gestartet werden. Bitte Sensorsperre am Gerät prüfen.");
        else call.resolve();
    }

    @PluginMethod
    public synchronized void stop(PluginCall call) {
        stopSampling();
        call.resolve();
    }

    private synchronized void stopSampling() {
        listening = false;
        if (manager != null) manager.unregisterListener(this);
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (!listening || sensor == null || event.sensor.getType() != sensor.getType()) return;
        final long t = event.timestamp;
        final float[] values = event.values;
        float x = values[0], y = values[1], z = values[2];

        if (rawAccelerometer) {
            // Gravity is ~9.81 m/s^2. Estimate its low-frequency vector using
            // elapsed sensor time so vendor-dependent sample rates do not change
            // the filter. This is only a movement estimate, NOT displacement.
            if (!hasGravity || gravityTimeNs == 0 || t - gravityTimeNs > 1_000_000_000L) {
                gravity[0] = x;
                gravity[1] = y;
                gravity[2] = z;
                hasGravity = true;
                gravityTimeNs = t;
                return; // no artificial pulse on the first sample / resume
            }
            double dt = Math.max(0.001, Math.min(0.25, (t - gravityTimeNs) / 1_000_000_000.0));
            gravityTimeNs = t;
            final float alpha = (float) Math.exp(-dt / 0.65);
            gravity[0] = alpha * gravity[0] + (1f - alpha) * x;
            gravity[1] = alpha * gravity[1] + (1f - alpha) * y;
            gravity[2] = alpha * gravity[2] + (1f - alpha) * z;
            x -= gravity[0];
            y -= gravity[1];
            z -= gravity[2];
        }

        if (lastEmittedNs != 0 && t - lastEmittedNs < 40_000_000L) return;
        lastEmittedNs = t;
        JSObject point = new JSObject();
        point.put("t", t / 1_000_000.0);
        point.put("x", x);
        point.put("y", y);
        point.put("z", z);
        if (listening) notifyListeners("sample", point);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) { }

    @Override
    protected void handleOnStop() {
        stopSampling();
        super.handleOnStop();
    }

    @Override
    protected void handleOnDestroy() {
        stopSampling();
        super.handleOnDestroy();
    }
}
