package com.outsideorelse.game;
import android.content.*;
public class ReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context,Intent intent){
        try {
        if("com.outsideorelse.REMINDER".equals(intent.getAction()))ReminderScheduler.deliver(context,intent.getIntExtra("id",0));
        else {
            if(Intent.ACTION_TIME_CHANGED.equals(intent.getAction())||Intent.ACTION_TIMEZONE_CHANGED.equals(intent.getAction())){
                // Do not predict challenge eligibility across a clock/timezone change.
                context.getSharedPreferences("pet-reminders",0).edit().putBoolean("clockChanged",true).commit();
            }
            ReminderScheduler.reschedule(context);
        }
        }catch(Exception ignored){ReminderScheduler.cancel(context);}
    }
}
