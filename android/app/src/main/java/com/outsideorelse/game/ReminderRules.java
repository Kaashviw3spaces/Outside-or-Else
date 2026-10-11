package com.outsideorelse.game;
import java.time.*;
import java.time.temporal.ChronoUnit;
final class ReminderRules {
    static boolean sameZone(String first,String second){try{return ZoneId.of(first).getRules().equals(ZoneId.of(second).getRules());}catch(Exception e){return false;}}
    static boolean alreadyDelivered(String delivered,LocalDate today){return today.toString().equals(delivered);}
    static boolean quiet(boolean enabled,LocalTime start,LocalTime end,LocalTime time){return enabled&&(start.equals(end)||(start.isBefore(end)?!time.isBefore(start)&&time.isBefore(end):!time.isBefore(start)||time.isBefore(end)));}
    static ZonedDateTime next(LocalTime time,boolean quiet,LocalTime start,LocalTime end,ZonedDateTime now){
        if(quiet&&start.equals(end))return null;
        ZonedDateTime at=now.toLocalDate().atTime(time).atZone(now.getZone());if(!at.isAfter(now))at=now.toLocalDate().plusDays(1).atTime(time).atZone(now.getZone());
        if(quiet(quiet,start,end,at.toLocalTime())){LocalDate date=at.toLocalDate();if(!end.isAfter(at.toLocalTime()))date=date.plusDays(1);at=date.atTime(end).atZone(now.getZone());}return at;
    }
    static boolean warning(boolean enabled,boolean paused,boolean protectedState,LocalDate grace,LocalDate latest,LocalDate today){LocalDate baseline=latest!=null&&latest.isAfter(grace)?latest:grace;return enabled&&!paused&&!protectedState&&ChronoUnit.DAYS.between(baseline,today)==2;}
    static int[] ids(boolean enabled,boolean allowed,boolean pet,boolean daily,boolean checkIn,boolean challenge){if(!enabled||!allowed||!pet)return new int[0];return java.util.stream.IntStream.of(daily?9101:0,checkIn?9102:0,challenge?9103:0).filter(i->i!=0).toArray();}
}
