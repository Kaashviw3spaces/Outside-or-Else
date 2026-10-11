param([switch]$OfflineVerification)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
if(Test-Path native/toolchain/jdk-21.0.12.1+1/bin/java.exe){$env:JAVA_HOME=Join-Path $projectRoot 'native/toolchain/jdk-21.0.12.1+1'}
$env:GRADLE_USER_HOME=Join-Path $projectRoot 'android/.gradle-cache'
npm.cmd run build
if($LASTEXITCODE -ne 0){throw 'Web build failed'}
npx.cmd cap sync android
if($LASTEXITCODE -ne 0){throw 'Capacitor sync failed'}
$gradleTask=if($OfflineVerification){'assembleOfflineVerify'}else{'assembleDebug'}
if(Test-Path native/toolchain/gradle-8.14.3/bin/gradle.bat){& ./native/toolchain/gradle-8.14.3/bin/gradle.bat -p android $gradleTask --no-daemon --console=plain}
else{Push-Location android;try{& ./gradlew.bat $gradleTask --no-daemon --console=plain}finally{Pop-Location}}
if($LASTEXITCODE -ne 0){throw 'Android build failed'}
