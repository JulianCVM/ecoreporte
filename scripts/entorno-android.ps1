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
#   runtime de reglas y Gradle puede fallar. Se usa el JBR que trae Android Studio.
# - `expo run:android` busca `emulator` y `adb` en el SDK. Sin ANDROID_HOME falla con
#   «spawn emulator ENOENT».
# No cambia variables del sistema: solo afecta a esta terminal.
# El archivo va en UTF-8 con BOM: sin BOM, Windows PowerShell 5.1 lo lee como ANSI.

$jbr = Join-Path $env:ProgramFiles 'Android\Android Studio\jbr'
$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'

foreach ($ruta in @($jbr, $sdk)) {
  if (-not (Test-Path $ruta)) {
    Write-Error "No existe $ruta. Instala Android Studio y su SDK (README, «Ejecutar en local»)."
    return
  }
}

$env:JAVA_HOME = $jbr
$env:ANDROID_HOME = $sdk
$env:Path = "$jbr\bin;$sdk\platform-tools;$sdk\emulator;$env:Path"

Write-Host "JAVA_HOME    = $env:JAVA_HOME"
Write-Host "ANDROID_HOME = $env:ANDROID_HOME"
& "$jbr\bin\java.exe" -version
Write-Host "Emuladores de Android disponibles:"
& "$sdk\emulator\emulator.exe" -list-avds
