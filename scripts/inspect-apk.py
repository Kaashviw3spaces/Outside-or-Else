import hashlib,json,pathlib,sys,zipfile
apk=pathlib.Path(sys.argv[1]);model='assets/Qwen_Qwen3-0.6B-Q4_K_M.gguf'
with zipfile.ZipFile(apk) as z:
    entry=z.getinfo(model)
    assert entry.file_size==484220320 and entry.compress_type==zipfile.ZIP_STORED
    digest=hashlib.file_digest(z.open(model),'sha256').hexdigest()
    assert digest=='9acfc1e001311f34b4252001b626f2e466d592a42065f66571bff3790d4e1b14'
    libs=[n for n in z.namelist() if n.startswith('lib/')]
    for name in ['libpet_inference.so','libllama.so','libggml.so','libggml-base.so','libggml-cpu.so','libc++_shared.so']:assert 'lib/arm64-v8a/'+name in libs,name
    assert 'assets/Qwen-Apache-2.0.txt' in z.namelist()
    report={'apk':str(apk),'bytes':apk.stat().st_size,'modelHash':digest,'modelUncompressed':True,'libraries':libs}
pathlib.Path('artifacts/checkpoint-9d/apk-inspection.json').write_text(json.dumps(report,indent=2))
print('PASS: complete uncompressed pinned GGUF, native arm64 library closure and model license in APK. Device execution NOT TESTED.')
