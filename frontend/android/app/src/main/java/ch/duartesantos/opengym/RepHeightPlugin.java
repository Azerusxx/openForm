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
 * Pressure-derived relative height for the experimental stacked-weight rep
 * counter. Unlike acceleration integration, pressure altitude is independent
 * of phone orientation. It is still noisy over short machine strokes.
 * No GPS, magnetometer, runtime permission, persistence or uploads.
 * Samples are dispatched only during a user-initiated foreground session.
 */
@CapacitorPlugin(name = "RepHeight")
public class RepHeightPlugin extends Plugin implements SensorEventListener {
    private SensorManager manager;
    private Sensor pressure;
    private volatile boolean listening = false;
    private int initialCount = 0;
    private float initialSum = 0;
    private float basePressure = 0;
    private long lastEmittedNs = 0;
    private volatile int nativeSamples = 0;
    private volatile int emittedSamples = 0;
    private volatile float lastPressureHpa = 0;
    private volatile long lastSensorTimeNs = 0;

    @Override
    public void load() {
        super.load();
        Context ctx = getContext();
        if (ctx == null) return;
        manager = (SensorManager) ctx.getSystemService(Context.SENSOR_SERVICE);
        if (manager != null) pressure = manager.getDefaultSensor(Sensor.TYPE_PRESSURE);
    }

    @PluginMethod
    public void available(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", pressure != null);
        result.put("sensorName", pressure == null ? "" : pressure.getName());
        result.put("mode", "pressure");
        result.put("permissionRequired", false);
        if (pressure == null) result.put("reason", "Dieses Gerät hat keinen Barometersensor. Bitte Bewegungsmodus verwenden.");
        call.resolve(result);
    }

    /**
     * Counts native pressure events separately from JS-delivered ones. This
     * distinguishes disabled/unresponsive hardware from WebView bridge problems
     * without recording motion, raw logs or any location history.
     */
    @PluginMethod
    public void diagnostics(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", pressure != null);
        result.put("listening", listening);
        result.put("nativeSamples", nativeSamples);
        result.put("emittedSamples", emittedSamples);
        result.put("baselineSamples", initialCount);
        result.put("baselineReady", initialCount >= 8);
        result.put("pressureHpa", lastPressureHpa);
        result.put("sensorTimeMs", lastSensorTimeNs / 1_000_000.0);
        call.resolve(result);
    }

    @PluginMethod
    public synchronized void start(PluginCall call) {
        if (pressure == null || manager == null) {
            call.reject("Kein Barometersensor verfügbar. Bewegungsmodus verwenden.");
            return;
        }
        stopSampling();
        initialCount = 0;
        initialSum = 0;
        basePressure = 0;
        lastEmittedNs = 0;
        nativeSamples = 0;
        emittedSamples = 0;
        lastPressureHpa = 0;
        lastSensorTimeNs = 0;
        // Request ~10 Hz; actual rate varies by hardware.
        listening = manager.registerListener(this, pressure, 100_000);
        if (!listening) call.reject("Barometersensor konnte nicht aktiviert werden.");
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
        if (!listening || event.sensor.getType() != Sensor.TYPE_PRESSURE) return;
        float p = event.values[0]; // hPa
        nativeSamples++;
        lastPressureHpa = p;
        lastSensorTimeNs = event.timestamp;
        if (!Float.isFinite(p) || p < 300 || p > 1100) return;
        if (initialCount < 8) {
            // Caller must keep the weight stack at rest for the first 8 samples.
            initialSum += p;
            initialCount++;
            if (initialCount == 8) basePressure = initialSum / 8f;
            return;
        }
        final long t = event.timestamp;
        if (lastEmittedNs != 0 && t - lastEmittedNs < 90_000_000L) return;
        lastEmittedNs = t;
        float height = SensorManager.getAltitude(basePressure, p);
        if (!Float.isFinite(height) || Math.abs(height) > 10f) return;
        JSObject sample = new JSObject();
        sample.put("t", t / 1_000_000.0);
        sample.put("h", height); // metres ABOVE the resting baseline
        sample.put("p", p); // hPa, for live diagnostics only; never stored
        if (listening) {
            emittedSamples++;
            notifyListeners("heightSample", sample);
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

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
