package com.outsideorelse.game;

/** Local display content only. No Android services, network, AI, or scheduling. */
final class ReminderCopy {
    enum Category { DAILY, CHECKIN, CHALLENGE, TEST }
    record Message(String title, String body) {}
    private static final String[] PERSONALITIES={"playful","sleepy","curious","shy","mischievous"};
    private static final String[][] CAT_VOICE={
        {"MEOW HEEK! boss has zoom thoughts.","MEOW! legs are tall paws. use paws.","MEOW! i command tiny chaos.","HEEK! royal wiggle demands human.","MEOW! human belongs to fun committee."},
        {"mrow. boss supervises from pillow.","mrow. i packed imaginary nap.","meow. pillow holds my royal duties.","mrow. legs move. loaf rests.","meow. nap council sent me."},
        {"mrrp. why shoes have no claws?","meow? nose requires answers.","mrrp. human legs are strange machinery.","meow? door holds secret grass?","mrrp. boss has leaf questions."},
        {"psst. small meow. i stay near.","little meow. my human, maybe?","soft prrr. tiny boss asks gently.","psst. meow. small paws support you.","quiet meow. human is my safe corner."},
        {"MEOW. tiny ruler commands the legs.","HEEK! boss has suspicious shoe plans.","MEOW! sock council answers to me.","mrrp. i own human. paperwork imaginary.","HEEK! royal loaf files dramatic complaint."}
    };
    private static final String[][] DOG_VOICE={
        {"WOOF! WALK WALK! tail has big ideas.","WOOF! human legs must do wiggle.","WOOF! boss brought entire tail.","WOOF HEEK! tail votes YES.","WOOF! human belongs to fun pack."},
        {"woof. sleepy boss supervises pillow.","woof. slow tail. big nap plans.","woof. pillow approved this message.","woof. nap first? legs can decide.","woof. sleepy paws sent little nudge."},
        {"ARF! why shoes have no noses?","WOOF? nose needs smell homework.","ARF! human legs are mystery sticks.","WOOF? door hides smell kingdom?","ARF! boss has tree questions."},
        {"soft woof. small tail stays near.","little woof. together, maybe?","quiet woof. tiny boss asks gently.","soft woof. little paws support you.","quiet woof. my human feels cozy."},
        {"BORK! boss commands shoe committee.","WOOF! tail has questionable plans.","BORK! socks answer to dog council.","WOOF! i own human. tail signed it.","BORK! tiny boss announces medium chaos."}
    };
    private static final String[][] CAT_CONTENT={
        {"Shoe time, human. put foot in shoe-glove.","Outside time. door exists. use door.","Walk time. ready your leg bones.","Human. shoes on. grass has important grass business.","Outside time. take water. boss requires sensible human."},
        {"Human? tiny paws request attention.","Little hello. rectangle contains your boss.","Psst. human. royal loaf sends hello.","Human check. i request one tiny greeting.","Tiny hello. imaginary nap report attached."},
        {"One full challenge day missed. Complete and save a photo adventure today to keep your streak safe.","Challenge warning. One full day missed. A completed photo adventure saved today can keep your streak safe.","One full challenge day missed. Save a completed photo adventure today. Your streak can still be kept safe.","Challenge needs attention today. One full day missed. Complete and save a photo adventure to keep your streak safe.","One full challenge day missed. Today can still count: complete and save a photo adventure to keep your streak safe."},
        {"Test nudge. phone go DING. i live in rectangle now.","Test received. rectangle has tiny boss inside.","Test nudge. imaginary paw pressed imaginary bell.","Test received. phone makes noise. loaf claims credit.","Test nudge. human. tiny rectangle kingdom is connected."}
    };
    private static final String[][] DOG_CONTENT={
        {"SHOE TIME! shoes on. door open. big smells wait!","WALK TIME! human. ready your leg bones!","OUTSIDE TIME! tree needs sniffing in spirit!","SHOES ON! tail has imaginary walk clipboard!","WALK TIME! take water. boss wants sensible human!"},
        {"Human hello! tail sends tiny greeting.","Little check-in. rectangle dog requests human.","Human? imaginary tail is waving.","Tiny hello! no fetch button. terrible rectangle.","Human check! tail council requests one hello."},
        {"One full challenge day missed. Complete and save a photo adventure today to keep your streak safe.","Challenge warning. One full day missed. A completed photo adventure saved today can keep your streak safe.","One full challenge day missed. Save a completed photo adventure today. Your streak can still be kept safe.","Challenge needs attention today. One full day missed. Complete and save a photo adventure to keep your streak safe.","One full challenge day missed. Today can still count: complete and save a photo adventure to keep your streak safe."},
        {"TEST WOOF! phone go DING. i claim tiny credit!","Test received! rectangle dog has bell opinions!","TEST NUDGE! imaginary paw. imaginary bell. real woof!","Test received! phone connected. tail committee celebrates!","TEST WOOF! human. your rectangle contains boss!"}
    };

    static Message select(String petId,String name,String species,String personality,Category category,long epochDay,long testSequence,boolean completedToday) {
        boolean dog="dog".equals(species);
        int persona=3; // Legacy/malformed snapshots use the existing shy default.
        for(int i=0;i<PERSONALITIES.length;i++)if(PERSONALITIES[i].equals(personality)){persona=i;break;}
        String seed=(petId==null?"":petId)+":"+species+":"+PERSONALITIES[persona]+":"+category.name();
        long step=category==Category.TEST?testSequence:epochDay;
        int variant=(int)Math.floorMod(Math.floorMod(step,5)+Math.floorMod(seed.hashCode(),5),5);
        String body=(dog?DOG_CONTENT:CAT_CONTENT)[category.ordinal()][variant]+" "+(dog?DOG_VOICE:CAT_VOICE)[persona][variant];
        if(category==Category.CHECKIN&&completedToday)body="Adventure saved today. "+body;
        String petName=name==null||name.isBlank()?"Your companion":name;
        return new Message(petName+" "+(dog?"🐶":persona==4?"😼":persona==1?"😴":"🐾"),body);
    }
}
