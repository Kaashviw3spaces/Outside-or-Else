"""Literal dialogue edits; keep every species/personality/event and array size."""
from pathlib import Path

changes = {
    'human. i have announcement. i forgot announcement. meow.': 'human. i own announcement. forgot announcement. MEOW.',
    'tail moved. MUST CATCH. wait is mine.': 'TAIL! must catch. wait. my tail.',
    'we walk today? yes? YES???': 'human. shoes are foot prisons. WE GO?',
    'human. shoes. outside? i bring fur. LOTS OF FUR.': 'outside has bugs. i require bug. MEOW MEOW HEEK!',
    'hello human. i choose you for possible employment.': 'human hired. snack salary required.',
    'HUMAN! Ball? Walk? Your sock? So many options!': 'BALL? TREE? LEAF? YES! WOOF!',
    'Tail says hello! Tail will not stop. WOOF.': 'TAIL SAYS HUMAN IS MINE. WOOF!',
    'HUMAN HUMAN. WALK??? We could walk!': 'SHOE! WALK! NOW! human belongs to tail!',
    'Shoes? Adventure? I volunteer! WOOF!': 'OUTSIDE SMELLS HUGE! human. we go. WOOF!',
    'FOOD! My bowl has a very good idea!': 'BOWL! FOOD! bowl has genius brain!',
    'Snack time! Tail doing helicopter! Woof!': 'SNACK! tail becomes helicopter! WOOF!',
    'Adventure started! I am your excited screen buddy!': 'timer on! screen dog supervises leg bones!',
    'Human typing! I watch! Is keyboard a toy?': 'human types. keyboard fetch? WOOF?',
    'Your rectangle has tiny moving words! WOW!': 'rectangle eats human. TAIL DEMANDS HUMAN!',
    'Human, your feet look like a good nap neighbor.': 'human feet. approved nap neighbors. woof.',
    'I was thinking about... zzz. Oh! Hello.': 'i had thought. pillow ate thought. zzz.',
    'Little walk? We can go slow. Nap afterward?': 'slow walk? i pack nap. woof.',
    'Shoes ready? My paws need a tiny warm-up.': 'shoe on. slow tail ready. nap later.',
    'Snack? I can wake up for that.': 'snack? nap permits snack. woof.',
    'Food first. Nap second. Very important order.': 'food. nap. boss wrote schedule.',
    'You type. I keep sleepy watch.': 'human types. sleepy boss guards pillow.',
    'Keyboard awake? I am barely awake. Woof.': 'keyboard awake. dog mostly pillow. woof.',
    'Human! Why does window have another world in it?': 'window holds world? how world fit? ARF?',
    'What is that? And that? My nose has questions!': 'nose has questions. human owes answers!',
    'Walk? Maybe something new to notice!': 'walk? nose demands smell homework!',
    'Shoes have no toes? So many questions before adventure!': 'shoe has no toes. nose investigates outside!',
    'Food inspection! Nose says promising!': 'bowl inspection. nose approves snack!',
    'What is in the bowl? I must investigate!': 'bowl mystery. boss eats evidence. ARF?',
    'Human typing! Why do letters have no smell?': 'letters have no smell. broken letters? ARF?',
    'What are words doing in that rectangle? Woof?': 'rectangle traps words. can nose rescue?',
    'Human... may I sit beside you?': 'human... small boss sits here? soft woof.',
    'Little tail wag. Glad you are here.': 'tiny tail says... my human. hello.',
    'Small adventure together? When you feel ready.': 'small walk... together? when ready. soft woof.',
    'Shoes? I can wait beside you.': 'shoes... maybe? i wait near my human.',
    'A snack for me? Little happy tail.': 'snack for small boss? tiny happy tail.',
    'Thank you, human. I will take a small bite.': 'thank you, human... tiny bite. soft woof.',
    'You type. I will sit close and listen.': 'you type... little ears stay close.',
    'Little ears ready, human. Quiet woof.': 'small boss listening... quiet woof.',
    'Human! Sock looks suspicious. I appoint myself inspector.': 'SOCK SUSPECT! boss arrests sock. BORK!',
    'I have a plan! Forgot plan. Tail has backup plan.': 'plan missing. tail plots backup crime. BORK!',
    'Walk proposal! I bring tail and questionable planning!': 'door exists! boss brings tail and bad plans!',
    'Shoes? Outside? I promise only moderate goofiness!': 'SHOES ON! boss promises medium chaos. BORK!',
    'Snack offering accepted by the Very Hungry Dog Council.': 'snack tribute accepted. hungry boss rules!',
    'Food! I bravely protect bowl from being full.': 'FOOD! bowl too full. boss fixes crime!',
    'You type? Is rectangle stealing my human again?': 'rectangle stole MY human. tail files crime!',
    'Keyboard has no fetch button? Design mystery!': 'no fetch button? illegal keyboard. BORK!',
}
p = Path('src/dialogue/library.ts')
text = p.read_text(encoding='utf-8')
for before, after in changes.items():
    assert before in text, before
    text = text.replace(before, after)
p.write_text(text, encoding='utf-8')
# Remove accidental sentence punctuation in existing additional variants only.
p = Path('src/dialogue/commonVariations.ts')
text = p.read_text(encoding='utf-8').replace('?. ', '? ').replace('!. ', '! ')
p.write_text(text, encoding='utf-8')
