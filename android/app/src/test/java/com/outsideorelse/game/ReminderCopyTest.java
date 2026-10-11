package com.outsideorelse.game;

import static org.junit.Assert.*;
import java.util.*;
import org.junit.Test;

public class ReminderCopyTest {
    private static final String[] PERSONAS={"playful","sleepy","curious","shy","mischievous"};

    @Test public void everySpeciesPersonalityAndExistingCategoryHasFiveStableVariants() {
        for(String species:new String[]{"cat","dog"})for(String persona:PERSONAS)for(ReminderCopy.Category category:ReminderCopy.Category.values()) {
            Set<String> variants=new HashSet<>();
            for(int i=0;i<5;i++) {
                ReminderCopy.Message copy=ReminderCopy.select("saved-pet","Tashu",species,persona,category,20000+i,i,false);
                assertTrue(copy.title().startsWith("Tashu "));
                assertTrue(copy.title().codePointCount(0,copy.title().length())<30);
                assertTrue(copy.body().length()<240);
                assertTrue(species+persona+category,variants.add(copy.body()));
                assertEquals(copy,ReminderCopy.select("saved-pet","Tashu",species,persona,category,20000+i,i,false));
                String lower=copy.body().toLowerCase(Locale.ROOT);
                assertFalse(lower.contains("20 min"));assertFalse(lower.contains("we walked"));assertFalse(lower.contains("human missing"));assertFalse(lower.contains("3 naps"));
                if(species.equals("cat")){assertFalse(lower.contains("woof"));assertFalse(lower.contains("bork"));}
                else {assertFalse(lower.contains("meow"));assertFalse(lower.contains("mrow"));assertFalse(lower.contains("loaf"));}
                if(category==ReminderCopy.Category.CHALLENGE){assertTrue(lower.contains("photo adventure"));assertTrue(lower.contains("today"));assertTrue(lower.contains("streak"));assertTrue(lower.contains("missed"));}
                if(category==ReminderCopy.Category.TEST)assertTrue(lower.startsWith("test"));
            }
        }
    }

    @Test public void personalitySavedNameAndCompletionStateAffectContentOnly() {
        for(String species:new String[]{"cat","dog"})for(ReminderCopy.Category category:ReminderCopy.Category.values()) {
            Set<String> voices=new HashSet<>();
            for(String persona:PERSONAS)voices.add(ReminderCopy.select("saved-id","Actual Saved Name",species,persona,category,20000,0,false).body());
            assertEquals(5,voices.size());
        }
        ReminderCopy.Message ordinary=ReminderCopy.select("id","Tashu","cat","shy",ReminderCopy.Category.CHECKIN,20000,0,false);
        ReminderCopy.Message completed=ReminderCopy.select("id","Tashu","cat","shy",ReminderCopy.Category.CHECKIN,20000,0,true);
        assertEquals("Adventure saved today. "+ordinary.body(),completed.body());
        assertFalse(ordinary.body().contains("Adventure saved today"));
        assertEquals(ReminderCopy.select("id","Tashu","cat","shy",ReminderCopy.Category.DAILY,20000,0,false),ReminderCopy.select("id","Tashu","cat","shy",ReminderCopy.Category.DAILY,20000,999,false));
        assertEquals(ReminderCopy.select("id","Tashu","cat","shy",ReminderCopy.Category.TEST,20000,2,false),ReminderCopy.select("id","Tashu","cat","shy",ReminderCopy.Category.TEST,20001,2,false));
        assertNotEquals(ReminderCopy.select("id","Tashu","cat","shy",ReminderCopy.Category.TEST,20000,2,false),ReminderCopy.select("id","Tashu","cat","shy",ReminderCopy.Category.TEST,20000,3,false));
        assertTrue(ReminderCopy.select("id",null,null,null,ReminderCopy.Category.TEST,Long.MIN_VALUE,Long.MAX_VALUE,false).title().startsWith("Your companion"));
    }
}
