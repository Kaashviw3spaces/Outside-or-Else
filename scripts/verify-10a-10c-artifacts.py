import hashlib,json,zipfile,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]; art=root/'artifacts/checkpoint-10a-10c'
hashbytes=lambda b:hashlib.sha256(b).hexdigest()
apk=root/'android/app/build/outputs/apk/debug/app-debug.apk'
with zipfile.ZipFile(apk) as z:
    icons=[]
    for name in z.namelist():
        if re.match(r'res/mipmap-.*?/ic_launcher.*\.png$',name):
            density=name.split('/')[1].replace('-v4','')
            source=root/'android/app/src/main/res'/density/Path(name).name
            icons.append({'name':name,'matchesSource':source.read_bytes()==z.read(name)})
    fonts={p.name:z.read('assets/public/fonts/gaegu/'+p.name)==p.read_bytes() for p in (root/'public/fonts/gaegu').iterdir() if p.is_file()}
    model=z.read('assets/Qwen_Qwen3-0.6B-Q4_K_M.gguf')
    webFiles=[p for p in (root/'dist').rglob('*') if p.is_file()]
    webMatches=all(z.read('assets/public/'+p.relative_to(root/'dist').as_posix())==p.read_bytes() for p in webFiles)
    config=json.loads(z.read('assets/capacitor.config.json'))
result={'bytes':apk.stat().st_size,'sha256':hashbytes(apk.read_bytes()),'iconPngCount':len(icons),'icons':icons,'fonts':fonts,'modelBytes':len(model),'modelSha256':hashbytes(model),'webFilesMatchFinalDist':webMatches,'config':config}
assert len(icons)==15 and all(i['matchesSource'] for i in icons) and all(fonts.values()) and webMatches
assert result['modelSha256']=='9acfc1e001311f34b4252001b626f2e466d592a42065f66571bff3790d4e1b14'
(art/'apk-verification.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
before=json.loads((art/'source-before.json').read_text(encoding='utf-8-sig'))
changes=[name for name,digest in before.items() if (root/name).exists() and hashbytes((root/name).read_bytes())!=digest and '/assets/public/' not in name]
(art/'production-changes.json').write_text(json.dumps(changes,indent=2),encoding='utf-8')
def readjson(path):
    data=path.read_bytes();return json.loads(data.decode('utf-16') if data.startswith(b'\xff\xfe') else data.decode('utf-8-sig'))
pre=readjson(art/'device-final-pre-upgrade.json');post=readjson(art/'device-final-post-upgrade.json')
assert pre==post==readjson(art/'device-initial-save.json')
assert readjson(art/'fixture-before-restart.json')==readjson(art/'fixture-after-restart.json')
(art/'final-preservation.json').write_text(json.dumps({'mainInitialBeforeAfterEqual':True,'fixturePhotoSaveRestartEqual':True,'main':post},indent=2),encoding='utf-8')
print(json.dumps({'apkBytes':result['bytes'],'apkSha256':result['sha256'],'webMatches':webMatches,'preservation':True,'changes':changes}))
