"""Apply the checkpoint's literal copy and typography changes only."""
from pathlib import Path
import re

def edit(name, replacements):
    p = Path(name)
    text = p.read_text(encoding='utf-8-sig')
    for before, after in replacements.items():
        assert before in text, (name, before)
        text = text.replace(before, after)
    p.write_text(text, encoding='utf-8')

for name in ['src/App.tsx', 'src/screens/Settings.tsx', 'src/screens/Onboarding.tsx']:
    edit(name, {'OUTSIDE OR ELSE<span>.</span>': 'Outside or Else<span>!</span>'})
edit('capacitor.config.ts', {"appName: 'OUTSIDE OR ELSE'": "appName: 'Outside or Else!'"})
edit('android/app/src/main/res/values/strings.xml', {'>OUTSIDE OR ELSE<': '>Outside or Else!<'})
edit('index.html', {'OUTSIDE OR ELSE — Your little outdoor companion': 'Outside or Else!'})
edit('src/lib/location.ts', {'OUTSIDE OR ELSE → Permissions': 'Outside or Else! → Permissions'})
edit('src/components/SplashScreen.tsx', {
    'OUTSIDE<br /><span>OR ELSE</span><span className="title-dot">.</span>': 'Outside<br /><span>or Else</span><span className="title-dot">!</span>',
    'A LITTLE PET. A BIG WORLD.': 'TINY PET. BIG DEMANDS.',
    'Your pet has one mission.<br />Get you outside.': 'human. door exists.<br />use door.',
    'Fresh air looks good on you.': 'you are my human. touch grass.'})
edit('src/App.tsx', {'A little more outside': 'door awaits'})
edit('src/screens/Home.tsx', {'aria-label={`${profile.name}\'s room`}': 'aria-label={`Outside or Else! — ${profile.name}\'s room`}'})
edit('src/screens/Onboarding.tsx', {
    'tiny creature.\\nbig shoe opinions.': 'tiny ruler.\\nbig shoe demands.',
    'less rectangle. more little adventures. meet a creature with suspicious opinions about doors.': 'human. less rectangle. more grass. tiny ruler awaits.',
    'cat or dog? choose your tiny co-conspirator.': 'cat or dog? choose your boss.',
    'choose wisely. tiny creature may judge the syllables.': 'name boss. boss judges syllables.',
    'books? trees? bean water? choose your kind of outside.': 'trees? books? bean water? pick outside.',
    'speak now. clock has many numbers. change this anytime.': 'pick shoe hour. change it anytime.',
    'short stroll counts. no giant leg expedition required.': 'short walk counts. giant legs optional.',
    'you now care for tiny creature. shoes remain your responsibility.': 'boss acquired. shoes are your problem.',
    'A preference for now. Reminders are coming later.': 'Your walk time. Set reminders in Settings.'})
edit('src/screens/Settings.tsx', {
    'MAKE YOURSELF AT HOME': 'HUMAN CONTROL PANEL',
    'adjust human knobs. tiny creature supervises.': 'turn human knobs. boss supervises.',
    'A very good {profile.species}. A very good friend.': 'Tiny {profile.species}. Big boss energy.',
    'Little sounds': 'tiny noises',
    'Soft tones when you pet or feed.': 'Scritch. Snack. Tiny sound.',
    'Your pet has one mission. Get you outside.': 'human. door exists. use door.',
    'Frontend checkpoint · saved on this browser': 'Saved locally on this device'})
edit('src/components/AppearanceSettings.tsx', {
    'A sunny little home or a cozy moonlit corner.': 'sun room. moon room. boss gets both.',
    'Your little world follows the real sky.': 'Your room follows the sky.',
    'Using approximate local-time lighting.': 'Sky follows your clock.',
    'Improve with my location': 'Use my location',
    'Finding your sky…': 'Finding your sky...',
    'Saved automatically. Make yourself comfortable.': 'Saved automatically. boss approves.'})
edit('src/lib/solar.ts', {'Using approximate local-time lighting.': 'Sky follows your clock.'})
edit('src/components/ConversationPanel.tsx', {
    'Tiny thoughts in progress…': 'tiny brain is cooking...',
    'Looking in our storybook…': 'sniffing the storybook...',
    'Little reactions, straight from the storybook. Offline.': 'tiny pet noises. From the storybook. Offline.',
    'Putting the thoughts together.': 'tiny thoughts. big saucepan.',
    'Collecting thoughts and organizing tiny chaos.': 'gathering brain crumbs...',
    'Your companion?s brain': 'Your companion’s brain',
    'your companion?s brain': 'your companion’s brain'})
edit('src/screens/Memories.tsx', {
    'tiny chapters. eyeball souvenirs. absolutely enormous feelings.': 'eyeball souvenirs. boss keeps receipts.',
    'Opening your scrapbook…': 'opening brain folder...',
    'A page to remember': 'boss keeps this page',
    'ROOM FOR A FIRST ADVENTURE': 'FIRST EYEBALL SOUVENIR GOES HERE'})
edit('src/components/Wardrobe.tsx', {'A LITTLE SOMETHING FOR YOU': 'BOSS NEEDS FASHION', 'Your look is saved.': 'Saved. boss wears the thing.'})
edit('src/components/NotificationSettings.tsx', {
    'Reminders start off. Choose what feels cozy. Your phone may deliver them later than your chosen time.': 'Nudges start off. Choose your nudges. Your phone may deliver them late.',
    'A little nudge from your companion.': 'boss has shoe opinions.',
    'A gentle hello each day.': 'daily hello. tiny boss checks human.'})

# Font declarations change; geometry, palette, artwork and animations stay intact.
for p in [Path('src/index.css'), *Path('src/styles').glob('*.css'), Path('src/ai/lab.css')]:
    text = p.read_text(encoding='utf-8')
    text = re.sub(r"'Trebuchet MS', 'Segoe UI', sans-serif|Georgia, 'Times New Roman', serif|'Trebuchet MS', sans-serif|Georgia,\s*serif", "'Gaegu', sans-serif", text)
    # Heading shorthand declarations must explicitly use the bundled bold face.
    text = re.sub(r"font:\s*(\d+px(?:/[\d.]+)?) 'Gaegu'", r"font:700 \1 'Gaegu'", text)
    text = text.replace("h1, h2 { font-family: 'Gaegu', sans-serif; font-weight: 400; }", "h1, h2, h3 { font-family: 'Gaegu', sans-serif; font-weight: 700; }")
    if p.name == 'index.css':
        text = text.replace('font-weight: 900', 'font-weight: 700')
        text = text.replace('font-size: clamp(32px, 7vw, 41px)', 'font-size: clamp(30px, 7vw, 36px)')
        text = text.replace('font-size: clamp(36px, 8vw, 46px)', 'font-size: clamp(30px, 8vw, 36px)')
        text = text.replace('button, input { font: inherit; }', 'button, input, select, textarea { font: inherit; }')
        text = text.replace("font-size: clamp(54px, 13vw, 78px);", "font-size: clamp(36px, 10vw, 48px);")
        text = text.replace('letter-spacing: -4px;', 'letter-spacing: -1px;')
        text = text.replace("font-family: 'Gaegu', sans-serif; font-size: 23px; font-weight: 400", "font-family: 'Gaegu', sans-serif; font-size: 23px; font-weight: 700")
        text = text.replace("font-family: 'Gaegu', sans-serif; font-size: 22px; font-weight: 400", "font-family: 'Gaegu', sans-serif; font-size: 22px; font-weight: 700")
        text += "\n/* Locally bundled faces also cover form controls and compact headings offline. */\n@font-face { font-family: 'Gaegu'; src: url('/fonts/gaegu/Gaegu-Regular.ttf') format('truetype'); font-weight: 400; font-style: normal; font-display: swap; }\n@font-face { font-family: 'Gaegu'; src: url('/fonts/gaegu/Gaegu-Bold.ttf') format('truetype'); font-weight: 700; font-style: normal; font-display: swap; }\n.section-heading h2 { font-size: 22px; }\n.wordmark { letter-spacing: 0; }\n"
    p.write_text(text, encoding='utf-8')
