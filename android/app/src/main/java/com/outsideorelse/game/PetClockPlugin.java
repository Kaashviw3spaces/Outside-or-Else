package com.outsideorelse.game;

import android.os.SystemClock;
import android.provider.Settings;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;

// Counts real elapsed time including device sleep, independent of the user's clock.
@CapacitorPlugin(name="PetClock")
public class PetClockPlugin extends Plugin {
    @PluginMethod public void read(PluginCall call) {
        try {
            int boot=Settings.Global.getInt(getContext().getContentResolver(),Settings.Global.BOOT_COUNT);
            JSObject result=new JSObject();result.put("ticks",SystemClock.elapsedRealtime());result.put("epoch","android:"+boot);call.resolve(result);
        } catch(Exception e) { call.reject("Adventure elapsed time is unavailable. Please try again."); }
    }
}
