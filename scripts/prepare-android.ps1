param([switch]$SkipModel)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
New-Item -ItemType Directory -Force -Path native/models,native/vendor | Out-Null
$revision='23b0202a189c44a54625aadcb37a946dd1d6278d'
if(!(Test-Path native/vendor/pinned-llama/include/llama.h)){
    Invoke-WebRequest "https://codeload.github.com/ggml-org/llama.cpp/zip/$revision" -OutFile native/llama-source.zip
    @'
import pathlib,zipfile
root=pathlib.Path('native/vendor/pinned-llama')
with zipfile.ZipFile('native/llama-source.zip') as z:
 for item in z.infolist():
  rel='/'.join(item.filename.split('/')[1:])
  if not rel or rel.startswith(('tools/ui/','examples/','tests/','.github/')): continue
  dest=root/rel
  if item.is_dir():dest.mkdir(parents=True,exist_ok=True)
  else:dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(z.read(item))
'@ | python
    if($LASTEXITCODE -ne 0){throw 'Source extraction failed'}
}
if(!$SkipModel){
    $modelPath='native/models/Qwen_Qwen3-0.6B-Q4_K_M.gguf'
    $expected='9acfc1e001311f34b4252001b626f2e466d592a42065f66571bff3790d4e1b14'
    if(!(Test-Path $modelPath) -or (Get-FileHash -LiteralPath $modelPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected){
        Invoke-WebRequest 'https://huggingface.co/bartowski/Qwen_Qwen3-0.6B-GGUF/resolve/60b85c0e3d8fe0f6474f406922a26d12aca4550d/Qwen_Qwen3-0.6B-Q4_K_M.gguf' -OutFile "$modelPath.download"
        if((Get-FileHash -LiteralPath "$modelPath.download" -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected){throw 'Downloaded model hash mismatch'}
        Move-Item -LiteralPath "$modelPath.download" -Destination $modelPath -Force
    }
    python scripts/inspect-bundled-model.py
    if($LASTEXITCODE -ne 0){throw 'Model verification failed'}
}
Write-Output 'Native sources prepared. Model acquisition happens during development only. The Android app never downloads weights.'
