package com.outsideorelse.game;
import static org.junit.Assert.*;
import android.content.Context;
import android.os.SystemClock;
import android.provider.Settings;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
public class ElapsedClockTest {
    @Test public void elapsedClockAndBootIdentityAreAvailable()throws Exception{
        Context c=InstrumentationRegistry.getInstrumentation().getTargetContext();assertTrue(c.getPackageName().endsWith(".offlineverify"));
        int boot=Settings.Global.getInt(c.getContentResolver(),Settings.Global.BOOT_COUNT);
        long before=SystemClock.elapsedRealtime();Thread.sleep(150);long delta=SystemClock.elapsedRealtime()-before;
        assertTrue(boot>=0);assertTrue(delta>=150);assertTrue(delta<5000);
    }
}
