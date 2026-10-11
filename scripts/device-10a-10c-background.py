import os, subprocess, time, json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
art=root/'artifacts/checkpoint-10a-10c'
adb=r'C:/Users/Saksham/AppData/Local/Android/Sdk/platform-tools/adb.exe'
marker=art/'native-generation-start.marker'
marker.unlink(missing_ok=True)
(art/'device-expression.js').write_text("""(async()=>{const original=Capacitor.nativePromise;Capacitor.nativePromise=function(plugin,method,...args){if(plugin==='PetInference'&&method==='generate')console.debug('QA_NATIVE_GENERATE_STARTED');return original.call(this,plugin,method,...args)};return __qaSend('What do you think about the moon?')})()""",encoding='utf-8')
env={**os.environ,'CDP_PORT':'9229'}
with (art/'final-ai-background.json').open('w',encoding='utf-8') as out,(art/'final-ai-background-error.txt').open('w',encoding='utf-8') as err:
    proc=subprocess.Popen(['node','scripts/device-10a-10c-evaluate.cjs','--native-start-file',str(marker)],cwd=root,env=env,stdout=out,stderr=err)
    limit=time.monotonic()+30
    while not marker.exists() and proc.poll() is None and time.monotonic()<limit:time.sleep(.1)
    backgrounded=marker.exists()
    if backgrounded:
        subprocess.run([adb,'shell','input','keyevent','KEYCODE_HOME'],check=True)
        time.sleep(8)
        subprocess.run([adb,'shell','am','start','-n','com.outsideorelse.game/.MainActivity'],check=True)
    code=proc.wait(timeout=300)
(art/'final-ai-background-control.json').write_text(json.dumps({'nativeStartObserved':backgrounded,'homeSeconds':8 if backgrounded else 0,'exitCode':code}),encoding='utf-8')
print((art/'final-ai-background-control.json').read_text())
print((art/'final-ai-background.json').read_text())
