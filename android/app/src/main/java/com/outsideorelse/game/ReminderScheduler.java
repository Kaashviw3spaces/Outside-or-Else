package com.outsideorelse.game;

import android.app.*;
import android.content.*;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import org.json.*;
import java.time.*;
import java.time.format.DateTimeFormatter;

// Persisted native alarms; every delivery rechecks the current committed snapshot.
final class ReminderScheduler {
    static final int DAILY=9101,CHECKIN=9102,CHALLENGE=9103,TEST=9104;
    static final String CHANNEL="pet-reminders";
    static JSONObject snapshot(Context c)throws JSONException{return new JSONObject(c.getSharedPreferences("pet-reminders",0).getString("snapshot","{}"));}
    static boolean allowed(Context c){NotificationChannel channel=((NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE)).getNotificationChannel(CHANNEL);return NotificationManagerCompat.from(c).areNotificationsEnabled()&&(channel==null||channel.getImportance()!=NotificationManager.IMPORTANCE_NONE);}
    static PendingIntent alarm(Context c,int id){return PendingIntent.getBroadcast(c,id,new Intent(c,ReminderReceiver.class).setAction("com.outsideorelse.REMINDER").putExtra("id",id),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
    static void cancel(Context c){AlarmManager a=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);for(int id:new int[]{DAILY,CHECKIN,CHALLENGE})a.cancel(alarm(c,id));c.getSharedPreferences("pet-reminders",0).edit().putInt("scheduled",0).commit();}
    static int scheduled(Context c){return c.getSharedPreferences("pet-reminders",0).getInt("scheduled",0);}
    static boolean quiet(JSONObject p,LocalTime t){return ReminderRules.quiet(p.optBoolean("quiet",true),LocalTime.parse(p.optString("quietStart","21:00")),LocalTime.parse(p.optString("quietEnd","08:00")),t);}
    static ZonedDateTime next(JSONObject p,ZonedDateTime now){
        return ReminderRules.next(LocalTime.parse(p.optString("time","17:30")),p.optBoolean("quiet",true),LocalTime.parse(p.optString("quietStart","21:00")),LocalTime.parse(p.optString("quietEnd","08:00")),now);
    }
    static boolean warning(JSONObject s,LocalDate today,String zone){
        if(s.optBoolean("completedToday")&&today.toString().equals(s.optString("date")))return false;
        JSONObject c=s.optJSONObject("challenge");if(c==null||!c.optBoolean("enabled")||c.optBoolean("paused")||!c.isNull("separatedAt")||!c.isNull("safetyReason")||!s.optString("petId").equals(c.optString("currentPetId"))||!ReminderRules.sameZone(zone,c.optString("timezone")))return false;
        LocalDate base=LocalDate.parse(c.optString("graceDate"));if(!c.isNull("lastQualifyingDate")){LocalDate last=LocalDate.parse(c.optString("lastQualifyingDate"));if(last.isAfter(base))base=last;}
        if(s.optBoolean("completedToday")){LocalDate completed=LocalDate.parse(s.optString("date"));if(completed.isAfter(base))base=completed;}
        return ReminderRules.warning(true,false,false,base,null,today);
    }
    static synchronized void reschedule(Context context){
        cancel(context);try{
            JSONObject s=snapshot(context),p=s.optJSONObject("prefs");if(p==null||!p.optBoolean("enabled")||s.isNull("petId")||!allowed(context)||p.optBoolean("quiet",true)&&p.optString("quietStart").equals(p.optString("quietEnd")))return;
            ZonedDateTime now=ZonedDateTime.now(),nextAt=next(p,now);int count=0;
            for(int id:ReminderRules.ids(p.optBoolean("enabled"),allowed(context),!s.isNull("petId"),p.optBoolean("daily"),p.optBoolean("checkIn"),p.optBoolean("challenge"))){
                String key=id==DAILY?"daily":id==CHECKIN?"checkIn":"challenge";if(!p.optBoolean(key))continue;
                ZonedDateTime at=nextAt;
                if(id==DAILY&&s.optBoolean("completedToday")&&at.toLocalDate().toString().equals(s.optString("date")))at=next(p,at.toLocalDate().plusDays(1).atStartOfDay(now.getZone()).minusNanos(1));
                if(id==CHALLENGE){
                    JSONObject state=s.optJSONObject("challenge");if(state==null)continue;
                    LocalDate base=LocalDate.parse(state.optString("graceDate"));if(!state.isNull("lastQualifyingDate")){LocalDate last=LocalDate.parse(state.optString("lastQualifyingDate"));if(last.isAfter(base))base=last;}
                    if(s.optBoolean("completedToday")){LocalDate completed=LocalDate.parse(s.optString("date"));if(completed.isAfter(base))base=completed;}
                    LocalDate warningDay=base.plusDays(2);if(at.toLocalDate().isBefore(warningDay))at=next(p,warningDay.atStartOfDay(now.getZone()).minusNanos(1));
                }
                if(id==CHALLENGE&&(context.getSharedPreferences("pet-reminders",0).getBoolean("clockChanged",false)||!warning(s,at.toLocalDate(),now.getZone().getId())))continue;
                // Deliberately inexact, no exact-alarm permission; the receiver checks quiet hours again.
                ((AlarmManager)context.getSystemService(Context.ALARM_SERVICE)).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at.toInstant().toEpochMilli(),alarm(context,id));count++;
            }
            context.getSharedPreferences("pet-reminders",0).edit().putInt("scheduled",count).commit();
        }catch(Exception e){cancel(context);throw new IllegalStateException("Could not schedule reminders",e);}
    }
    static synchronized void deliver(Context context,int id){
        try{
            JSONObject s=snapshot(context),p=s.optJSONObject("prefs");ZonedDateTime now=ZonedDateTime.now();String date=now.toLocalDate().toString();
            if(p==null||!p.optBoolean("enabled")||s.isNull("petId")||!allowed(context)||quiet(p,now.toLocalTime()))return;
            if(id==DAILY&&(!p.optBoolean("daily")||s.optBoolean("completedToday")&&date.equals(s.optString("date"))))return;
            if(id==CHECKIN&&!p.optBoolean("checkIn"))return;
            if(id==CHALLENGE&&(!p.optBoolean("challenge")||context.getSharedPreferences("pet-reminders",0).getBoolean("clockChanged",false)||!warning(s,now.toLocalDate(),now.getZone().getId())))return;
            if(id!=DAILY&&id!=CHECKIN&&id!=CHALLENGE)return;
            String key="delivered:"+s.optString("petId")+":"+id;if(ReminderRules.alreadyDelivered(context.getSharedPreferences("pet-reminders",0).getString(key,""),now.toLocalDate()))return;
            ReminderCopy.Category category=id==DAILY?ReminderCopy.Category.DAILY:id==CHECKIN?ReminderCopy.Category.CHECKIN:ReminderCopy.Category.CHALLENGE;
            ReminderCopy.Message copy=ReminderCopy.select(s.optString("petId"),s.optString("name","Your companion"),s.optString("species","cat"),s.optString("personality","shy"),category,now.toLocalDate().toEpochDay(),0,s.optBoolean("completedToday")&&date.equals(s.optString("date")));
            show(context,id,copy.title(),copy.body());context.getSharedPreferences("pet-reminders",0).edit().putString(key,date).commit();
        }catch(Exception ignored){}finally{try{reschedule(context);}catch(Exception ignored){cancel(context);}}
    }
    static void test(Context c)throws Exception{JSONObject s=snapshot(c),p=s.optJSONObject("prefs");if(!allowed(c)||p==null||!p.optBoolean("enabled")||quiet(p,LocalTime.now()))throw new Exception("Reminders need permission, must be enabled, and respect quiet hours.");android.content.SharedPreferences saved=c.getSharedPreferences("pet-reminders",0);long sequence=saved.getLong("testCopySequence",0);ReminderCopy.Message copy=ReminderCopy.select(s.optString("petId"),s.optString("name","Your companion"),s.optString("species","cat"),s.optString("personality","shy"),ReminderCopy.Category.TEST,LocalDate.now().toEpochDay(),sequence,false);show(c,TEST,copy.title(),copy.body());saved.edit().putLong("testCopySequence",sequence==Long.MAX_VALUE?0:sequence+1).commit();}
    static void show(Context c,int id,String name,String body){
        NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
        if(Build.VERSION.SDK_INT>=26)manager.createNotificationChannel(new NotificationChannel(CHANNEL,"Pet reminders",NotificationManager.IMPORTANCE_DEFAULT));
        if(Build.VERSION.SDK_INT>=26){NotificationChannel channel=manager.getNotificationChannel(CHANNEL);if(channel!=null&&channel.getImportance()==NotificationManager.IMPORTANCE_NONE)throw new IllegalStateException("Pet reminders are blocked in phone settings");}
        PendingIntent open=PendingIntent.getActivity(c,0,new Intent(c,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        NotificationManagerCompat.from(c).notify(id,new NotificationCompat.Builder(c,CHANNEL).setSmallIcon(R.drawable.ic_pet_reminder).setContentTitle(name).setContentText(body).setStyle(new NotificationCompat.BigTextStyle().bigText(body)).setContentIntent(open).setAutoCancel(true).build());
    }
}
