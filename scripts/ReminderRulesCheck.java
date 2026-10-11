package com.outsideorelse.game;
import java.time.*;
import java.util.*;
public class ReminderRulesCheck {
    static void check(boolean result,String message){if(!result)throw new AssertionError(message);}
    public static void main(String[] args){
        LocalTime start=LocalTime.of(21,0),end=LocalTime.of(8,0);
        check(ReminderRules.sameZone("Asia/Calcutta","Asia/Kolkata"),"Browser/Android timezone aliases");check(!ReminderRules.sameZone("Asia/Kolkata","America/New_York"),"Different timezone protection");
        check(ReminderRules.quiet(true,start,end,LocalTime.of(23,59)),"Overnight quiet");check(ReminderRules.quiet(true,start,end,LocalTime.MIDNIGHT),"Midnight quiet");check(!ReminderRules.quiet(true,start,end,end),"End boundary");check(ReminderRules.quiet(true,start,start,end),"All day quiet");check(!ReminderRules.quiet(false,start,end,start),"Quiet disabled");
        ZonedDateTime now=ZonedDateTime.of(2026,10,11,20,0,0,0,ZoneId.of("Asia/Kolkata"));
        check(ReminderRules.next(LocalTime.of(22,0),true,start,end,now).equals(now.toLocalDate().plusDays(1).atTime(end).atZone(now.getZone())),"Quiet deferral crosses local day");
        ZonedDateTime dst=ZonedDateTime.of(2026,3,8,0,0,0,0,ZoneId.of("America/New_York"));check(ReminderRules.next(LocalTime.of(2,30),false,start,end,dst).getHour()==3,"DST gap resolved locally");
        LocalDate grace=now.toLocalDate();check(!ReminderRules.warning(true,false,false,grace,null,grace.plusDays(1)),"Grace and first full day");check(ReminderRules.warning(true,false,false,grace,null,grace.plusDays(2)),"One missed day warning");check(!ReminderRules.warning(true,false,false,grace,null,grace.plusDays(3)),"Suppress expired warning");check(!ReminderRules.warning(true,true,false,grace,null,grace.plusDays(2)),"Paused");check(!ReminderRules.warning(false,false,false,grace,null,grace.plusDays(2)),"Opt-in");check(!ReminderRules.warning(true,false,true,grace,null,grace.plusDays(2)),"Clock safety");check(!ReminderRules.warning(true,false,false,grace,grace.plusDays(2),grace.plusDays(2)),"Completion resets");
        check(ReminderRules.alreadyDelivered(grace.toString(),grace),"Same-day duplicate blocked");check(!ReminderRules.alreadyDelivered(grace.toString(),grace.plusDays(1)),"Next local day allowed");
        check(ReminderRules.ids(true,false,true,true,true,true).length==0,"Denied permission plans no alarms");check(ReminderRules.ids(false,true,true,true,true,true).length==0,"Disable cancels plan");check(ReminderRules.ids(true,true,false,true,true,true).length==0,"No companion");check(Arrays.equals(ReminderRules.ids(true,true,true,true,true,true),new int[]{9101,9102,9103}),"Stable unique identifiers");
        System.out.println("PASS: native reminder rules: denial/disabled/no-pet plans, stable IDs, quiet boundaries/overnight/all-day, DST, local day, grace, opt-in, pause, safety, missed-day expiry/completion. Android alarm delivery NOT TESTED.");
    }
}
