package com.outsideorelse.game;
import android.Manifest;
import android.os.Build;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import org.json.JSONObject;

@CapacitorPlugin(name="PetReminders",permissions={@Permission(alias="notifications",strings={Manifest.permission.POST_NOTIFICATIONS})})
public class PetRemindersPlugin extends Plugin {
    private JSObject state(){JSObject s=new JSObject();s.put("permission",ReminderScheduler.allowed(getContext())?"granted":Build.VERSION.SDK_INT>=33&&getPermissionState("notifications")==PermissionState.PROMPT?"prompt":"denied");s.put("scheduled",ReminderScheduler.scheduled(getContext()));return s;}
    @PluginMethod public void status(PluginCall call){call.resolve(state());}
    @PluginMethod public void requestPermission(PluginCall call){if(Build.VERSION.SDK_INT>=33&&getPermissionState("notifications")!=PermissionState.GRANTED)requestPermissionForAlias("notifications",call,"permissionResult");else call.resolve(state());}
    @PermissionCallback private void permissionResult(PluginCall call){call.resolve(state());}
    @PluginMethod public void sync(PluginCall call){try{
        JSONObject snapshot=new JSONObject(call.getString("snapshot","{}"));
        JSONObject challenge=snapshot.optJSONObject("challenge");boolean fresh=challenge!=null&&snapshot.optString("date").equals(challenge.optString("lastEvaluationDate"))&&snapshot.optString("timezone").equals(challenge.optString("timezone"));
        android.content.SharedPreferences saved=getContext().getSharedPreferences("pet-reminders",0);
        if(!saved.edit().putString("snapshot",snapshot.toString()).putBoolean("clockChanged",!fresh&&saved.getBoolean("clockChanged",false)).commit())throw new Exception("Could not save reminders");
        if(snapshot.optJSONObject("prefs")==null||!snapshot.getJSONObject("prefs").optBoolean("enabled")){for(int id:new int[]{9101,9102,9103,9104})androidx.core.app.NotificationManagerCompat.from(getContext()).cancel(id);}
        ReminderScheduler.reschedule(getContext());call.resolve(state());
    }catch(Exception e){ReminderScheduler.cancel(getContext());call.reject("Could not schedule reminders: "+e.getMessage());}}
    @PluginMethod public void test(PluginCall call){try{ReminderScheduler.test(getContext());call.resolve();}catch(Exception e){call.reject(e.getMessage());}}
}
