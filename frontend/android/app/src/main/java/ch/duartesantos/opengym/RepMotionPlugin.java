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
 * Opt-in, on-device linear acceleration stream for the experimental gym rep counter.
 * No workout data or motion samples are uploaded or persisted by this plugin.
 * It only operates while the counter sheet is open and the app is in the foreground.
 * Raw acceleration includes NO gravity; do not confuse it with displacement.
 */
@CapacitorPlugin(name = "RepMotion")
public class RepMotionPlugin extends Plugin implements SensorEventListener {
    private SensorManager manager;
    private Sensor sensor;
    private volatile boolean listening = false;
    private long lastEmittedNs = 0;

    @Override
    public void load() {
        super.load();
        Context ctx = getContext();
        if (ctx == null) return;
        manager = (SensorManager) ctx.getSystemService(Context.SENSOR_SERVICE);
        if (manager != null) sensor = manager.getDefaultSensor(Sensor.TYPE_LINEAR_ACCELERATION);
    }

    @PluginMethod
    public void available(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", sensor != null);
        call.resolve(result);
    }

    @PluginMethod
    public synchronized void start(PluginCall call) {
        if (manager == null || sensor == null) {
            call.reject("Kein linearer Beschleunigungssensor verfügbar.");
            return;
        }
        stopSampling();
        lastEmittedNs = 0;
        // 25 Hz maximum is enough for slow controlled machine repetitions and avoids
        // flooding the WebView bridge while a workout timer and animations are active.
        listening = manager.registerListener(this, sensor, 40_000);
        if (!listening) call.reject("Der Bewegungssensor konnte nicht gestartet werden.");
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
        if (!listening || event.sensor.getType() != Sensor.TYPE_LINEAR_ACCELERATION) return;
        long t = event.timestamp;
        if (lastEmittedNs != 0 && t - lastEmittedNs < 40_000_000L) return;
        lastEmittedNs = t;
        JSObject point = new JSObject();
        point.put("t", t / 1_000_000.0);
        point.put("x", event.values[0]);
        point.put("y", event.values[1]);
        point.put("z", event.values[2]);
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
