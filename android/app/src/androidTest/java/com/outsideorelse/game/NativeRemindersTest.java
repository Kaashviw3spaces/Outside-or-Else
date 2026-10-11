package com.outsideorelse.game;
import static org.junit.Assert.*;
import org.junit.Test;
import android.Manifest;
import android.app.NotificationManager;
import android.os.Build;
import android.content.Context;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.*;
import java.time.*;
public class NativeRemindersTest {
    @Test public void schedulesCancelQuietAndDuplicateDelivery()throws Exception{
        Context c=InstrumentationRegistry.getInstrumentation().getTargetContext();assertTrue(c.getPackageName().endsWith(".offlineverify"));
        if(Build.VERSION.SDK_INT>=33)InstrumentationRegistry.getInstrumentation().getUiAutomation().grantRuntimePermission(c.getPackageName(),Manifest.permission.POST_NOTIFICATIONS);
        NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
        c.getSharedPreferences("pet-reminders",0).edit().clear().commit();
        JSONObject prefs=new JSONObject().put("enabled",true).put("daily",true).put("checkIn",true).put("challenge",false).put("time","17:30").put("quiet",false).put("quietStart","21:00").put("quietEnd","08:00");
        JSONObject snapshot=new JSONObject().put("prefs",prefs).put("petId","instrumented-pet").put("name","Miso").put("date",LocalDate.now().toString()).put("completedToday",false);
        try{
            c.getSharedPreferences("pet-reminders",0).edit().putString("snapshot",snapshot.toString()).commit();ReminderScheduler.reschedule(c);assertEquals(2,ReminderScheduler.scheduled(c));
            ReminderScheduler.deliver(c,ReminderScheduler.DAILY);Thread.sleep(500);assertEquals(1,manager.getActiveNotifications().length);long first=manager.getActiveNotifications()[0].getPostTime();
            ReminderScheduler.deliver(c,ReminderScheduler.DAILY);Thread.sleep(100);assertEquals(first,manager.getActiveNotifications()[0].getPostTime());
            prefs.put("quiet",true).put("quietStart","08:00").put("quietEnd","08:00");c.getSharedPreferences("pet-reminders",0).edit().putString("snapshot",snapshot.toString()).commit();ReminderScheduler.reschedule(c);assertEquals(0,ReminderScheduler.scheduled(c));
            prefs.put("enabled",false);c.getSharedPreferences("pet-reminders",0).edit().putString("snapshot",snapshot.toString()).commit();ReminderScheduler.reschedule(c);assertEquals(0,ReminderScheduler.scheduled(c));
        }finally{ReminderScheduler.cancel(c);manager.cancelAll();c.getSharedPreferences("pet-reminders",0).edit().clear().commit();}
    }
}
