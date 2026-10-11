package com.outsideorelse.game;
import static org.junit.Assert.*;
import android.Manifest;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.service.notification.StatusBarNotification;
import android.util.Log;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.json.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
public class ScheduledDeliveryTest {
    @Test public void actualAlarmReceiverDeliveryWhileBackgroundedAndLocked()throws Exception{
        Context c=InstrumentationRegistry.getInstrumentation().getTargetContext();assertTrue(c.getPackageName().endsWith(".offlineverify"));
        if(Build.VERSION.SDK_INT>=33)InstrumentationRegistry.getInstrumentation().getUiAutomation().grantRuntimePermission(c.getPackageName(),Manifest.permission.POST_NOTIFICATIONS);
        NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
        c.getSharedPreferences("pet-reminders",0).edit().clear().commit();manager.cancelAll();
        ZonedDateTime target=ZonedDateTime.now().plusMinutes(2).withSecond(0).withNano(0);
        JSONObject p=new JSONObject().put("enabled",true).put("daily",true).put("checkIn",true).put("challenge",true).put("time",target.format(DateTimeFormatter.ofPattern("HH:mm"))).put("quiet",false).put("quietStart","23:00").put("quietEnd","08:00");
        JSONObject challenge=new JSONObject().put("enabled",true).put("paused",false).put("currentPetId","qa-only").put("graceDate",LocalDate.now().minusDays(2).toString()).put("lastQualifyingDate",JSONObject.NULL).put("separatedAt",JSONObject.NULL).put("safetyReason",JSONObject.NULL).put("timezone",ZoneId.systemDefault().getId());
        JSONObject s=new JSONObject().put("prefs",p).put("petId","qa-only").put("name","QA Cat").put("species","cat").put("personality","mischievous").put("date",LocalDate.now().toString()).put("completedToday",false).put("challenge",challenge);
        try{
            c.getSharedPreferences("pet-reminders",0).edit().putString("snapshot",s.toString()).commit();ReminderScheduler.reschedule(c);assertEquals(3,ReminderScheduler.scheduled(c));
            Log.i("ScheduledDeliveryEvidence","expectedEpochMs="+target.toInstant().toEpochMilli()+" expectedLocal="+target);
            InstrumentationRegistry.getInstrumentation().getUiAutomation().executeShellCommand("input keyevent KEYCODE_HOME").close();
            InstrumentationRegistry.getInstrumentation().getUiAutomation().executeShellCommand("input keyevent KEYCODE_SLEEP").close();
            Map<Integer,Long> posted=new HashMap<>();long deadline=SystemClockCompat.now()+420000;
            while(SystemClockCompat.now()<deadline&&posted.size()<3){
                for(StatusBarNotification n:manager.getActiveNotifications())if(n.getId()>=9101&&n.getId()<=9103&&!posted.containsKey(n.getId())){
                    posted.put(n.getId(),n.getPostTime());Log.i("ScheduledDeliveryEvidence","id="+n.getId()+" observedEpochMs="+n.getPostTime()+" delayMs="+(n.getPostTime()-target.toInstant().toEpochMilli()));
                    assertTrue(n.getNotification().extras.getString("android.title").startsWith("QA Cat"));
                }
                Thread.sleep(1000);
            }
            assertEquals("Actual inexact alarm deliveries within seven minutes",3,posted.size());
            for(int id:new int[]{9101,9102,9103})ReminderScheduler.deliver(c,id);
            for(StatusBarNotification n:manager.getActiveNotifications())if(posted.containsKey(n.getId()))assertEquals(posted.get(n.getId()).longValue(),n.getPostTime());
            manager.cancelAll();p.put("quiet",true).put("quietStart","08:00").put("quietEnd","08:00");c.getSharedPreferences("pet-reminders",0).edit().putString("snapshot",s.toString()).commit();ReminderScheduler.reschedule(c);assertEquals(0,ReminderScheduler.scheduled(c));
            for(int id:new int[]{9101,9102,9103})ReminderScheduler.deliver(c,id);assertEquals(0,manager.getActiveNotifications().length);
            p.put("quiet",false).put("enabled",false);c.getSharedPreferences("pet-reminders",0).edit().putString("snapshot",s.toString()).commit();ReminderScheduler.reschedule(c);assertEquals(0,ReminderScheduler.scheduled(c));
            ReminderScheduler.deliver(c,9101);assertEquals(0,manager.getActiveNotifications().length);
            Log.i("ScheduledDeliveryEvidence","PASS real alarms, duplicate prevention, quiet gate and opt-out; isolated package="+c.getPackageName());
        }finally{
            ReminderScheduler.cancel(c);manager.cancelAll();c.getSharedPreferences("pet-reminders",0).edit().clear().commit();
            InstrumentationRegistry.getInstrumentation().getUiAutomation().executeShellCommand("input keyevent KEYCODE_WAKEUP").close();
        }
    }
    private static class SystemClockCompat {static long now(){return android.os.SystemClock.elapsedRealtime();}}
}
