# Prepara la terminal de PowerShell para compilar EcoReporte y levantar los emuladores.
#
# Uso, desde la raíz del repositorio y con el punto delante (así las variables quedan en
# la sesión actual):
#
#   . .\scripts\entorno-android.ps1
#
# Por qué existe:
# - Gradle y los emuladores de Firebase necesitan Java 21. Si en el PATH del sistema hay un
#   JDK más nuevo (por ejemplo, el 25 de Adoptium), el emulador de Storage avisa errores del
#   runtime de reglas y Gradle puede fallar. Se prefiere el JBR que trae Android Studio; si
#   está incompleto (sin lib\jvm.cfg, AM-14), se busca otro JDK 21.
# - `expo run:android` busca `emulator` y `adb` en el SDK. Sin ANDROID_HOME falla con
#   «spawn emulator ENOENT».
# - React Native 0.88 exige Node 22.13+ o 24.3+. Si el Node del sistema es más viejo y hay un
#   Node portátil en %LOCALAPPDATA%\Programs\node24, se pone primero en el PATH.
# No cambia variables del sistema: solo afecta a esta terminal. Al final corre el diagnóstico
# (`npm run entorno:diagnostico`), que dice qué más falta.
# El archivo va en UTF-8 con BOM: sin BOM, Windows PowerShell 5.1 lo lee como ANSI.

$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if (-not (Test-Path $sdk)) {
  Write-Error "No existe $sdk. Instala Android Studio y su SDK (README, «Ejecutar en local»)."
  return
}

# Un JDK sirve si tiene java.exe y lib\jvm.cfg: sin ese archivo, java no arranca.
function Test-JdkHome([string] $jdkHome) {
  return $jdkHome -and (Test-Path (Join-Path $jdkHome 'bin\java.exe')) -and
    (Test-Path (Join-Path $jdkHome 'lib\jvm.cfg'))
}

$jdkCandidates = @(Join-Path $env:ProgramFiles 'Android\Android Studio\jbr')
if ($env:JAVA_HOME) { $jdkCandidates += $env:JAVA_HOME }
foreach ($vendorDir in @('Java', 'Eclipse Adoptium', 'Microsoft')) {
  $jdkCandidates += Get-ChildItem (Join-Path $env:ProgramFiles $vendorDir) -Directory `
    -Filter 'jdk-21*' -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName }
}
$jdk = $jdkCandidates | Where-Object { Test-JdkHome $_ } | Select-Object -First 1
if (-not $jdk) {
  Write-Error 'No hay un JDK 21 utilizable: repara Android Studio o instala un JDK 21.'
  return
}

$portableNode = Join-Path $env:LOCALAPPDATA 'Programs\node24'
$nodeVersion = (& node -v 2>$null)
if ($nodeVersion -notmatch '^v(2[2-9]|[3-9]\d)\.' -and (Test-Path "$portableNode\node.exe")) {
  $env:Path = "$portableNode;$env:Path"
}

$env:JAVA_HOME = $jdk
$env:ANDROID_HOME = $sdk
$env:Path = "$jdk\bin;$sdk\platform-tools;$sdk\emulator;$env:Path"

Write-Host "JAVA_HOME    = $env:JAVA_HOME"
Write-Host "ANDROID_HOME = $env:ANDROID_HOME"
Write-Host "Node         = $(& node -v)"
node scripts/diagnostico-entorno.js
