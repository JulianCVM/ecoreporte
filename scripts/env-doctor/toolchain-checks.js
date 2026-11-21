// @ts-check
// Evaluaciones puras de las herramientas del PC: Node, Java, SDK de Android, NDK, CMake, memoria y
// rutas largas. Reciben lo que midieron las sondas (probes.js) y deciden si está bien, si es un
// aviso o si bloquea, con el arreglo. No tocan el disco ni la red.

const { result } = require('./check-result');
const { compareVersions, parseVersion, satisfiesRange } = require('./versions');

/** Java de Gradle y de los emuladores de Firebase (README y docs/04-infraestructura.md). */
const REQUIRED_JAVA_MAJOR = 21;
/**
 * CMake mínimo en Windows. El CMake 3.22.1 del SDK trae ninja 1.10.2, que no crea rutas de más de
 * 260 caracteres, y las de react-native-worklets llegan a unos 319. El 3.31 trae ninja 1.12 (AM-13).
 * @type {import('./versions').Version}
 */
const MIN_WINDOWS_CMAKE = [3, 31, 0];
const GB = 1024 ** 3;
/** Gradle necesita unos 4 GB libres y con el emulador de Android, unos 6 (README, «Memoria»). */
const MIN_FREE_RAM_BYTES = 4 * GB;
const RECOMMENDED_FREE_RAM_BYTES = 6 * GB;

/**
 * @param {string} nodeVersion `process.version`
 * @param {string | null} engineRange `engines.node` de react-native; null sin node_modules
 */
function evaluateNode(nodeVersion, engineRange) {
  const label = 'Node';
  if (!engineRange) {
    return result(
      label,
      'fail',
      'No hay node_modules: no se puede leer la versión exigida',
      'npm ci',
    );
  }
  const version = parseVersion(nodeVersion);
  if (version && satisfiesRange(version, engineRange)) {
    return result(label, 'ok', `${nodeVersion} cumple ${engineRange}`);
  }
  return result(
    label,
    'fail',
    `${nodeVersion} no cumple ${engineRange} (React Native)`,
    'Instala Node 24 LTS y ponlo primero en el PATH de la terminal',
  );
}

/**
 * @param {number | null} javaMajor versión mayor del `java` de JAVA_HOME (o del PATH)
 * @param {string | null} javaHome
 */
function evaluateJava(javaMajor, javaHome) {
  const label = 'Java (JAVA_HOME)';
  const fix = `Apunta JAVA_HOME a un JDK ${REQUIRED_JAVA_MAJOR}: . .\\scripts\\entorno-android.ps1`;
  if (javaMajor === null) {
    return result(
      label,
      'fail',
      `No se pudo ejecutar java (JAVA_HOME=${javaHome ?? 'vacío'})`,
      fix,
    );
  }
  if (javaMajor !== REQUIRED_JAVA_MAJOR) {
    const status = javaMajor < REQUIRED_JAVA_MAJOR ? 'fail' : 'warn';
    return result(label, status, `Java ${javaMajor}; se espera ${REQUIRED_JAVA_MAJOR}`, fix);
  }
  if (!javaHome) {
    return result(label, 'warn', `Java ${javaMajor} del PATH, pero JAVA_HOME está vacío`, fix);
  }
  return result(label, 'ok', `Java ${javaMajor} en ${javaHome}`);
}

/**
 * El JBR de Android Studio puede quedar a medias (sin `lib/jvm.cfg`) y `java` no arranca.
 * @param {{ exists: boolean, complete: boolean, path: string }} jbr
 * @returns {CheckResult | null} null si Android Studio no está en la ruta por defecto
 */
function evaluateJbr(jbr) {
  if (!jbr.exists) return null;
  const label = 'JBR de Android Studio';
  if (jbr.complete) return result(label, 'ok', jbr.path);
  return result(
    label,
    'warn',
    `${jbr.path} está incompleto (falta lib/jvm.cfg)`,
    'Repara o reinstala Android Studio; mientras tanto, usa otro JDK 21 en JAVA_HOME',
  );
}

/**
 * @param {string | null} sdkPath
 * @param {{ platformTools: boolean, emulator: boolean, cmdlineTools: boolean }} parts
 * @returns {CheckResult[]}
 */
function evaluateSdk(sdkPath, parts) {
  if (!sdkPath) {
    return [
      result(
        'SDK de Android',
        'fail',
        'No se encontró (ANDROID_HOME vacío y sin SDK en la ruta por defecto)',
        'Instala Android Studio y su SDK',
      ),
    ];
  }
  const sdkManager = 'Android Studio → SDK Manager → SDK Tools';
  return [
    result('SDK de Android', 'ok', sdkPath),
    parts.platformTools
      ? result('platform-tools (adb)', 'ok', 'instalado')
      : result('platform-tools (adb)', 'fail', 'falta', `${sdkManager} → Platform-Tools`),
    parts.emulator
      ? result('Emulador de Android', 'ok', 'instalado')
      : result(
          'Emulador de Android',
          'warn',
          'falta (no hace falta con celular físico)',
          `${sdkManager} → Emulator`,
        ),
    parts.cmdlineTools
      ? result('cmdline-tools', 'ok', 'instalado')
      : result(
          'cmdline-tools',
          'warn',
          'falta: sin sdkmanager ni avdmanager',
          `${sdkManager} → Command-line Tools`,
        ),
  ];
}

/**
 * @param {string | null} required `ndkVersion` del catálogo de React Native
 * @param {string[]} installed
 */
function evaluateNdk(required, installed) {
  const label = 'NDK';
  if (!required)
    return result(label, 'warn', 'No se pudo leer la versión exigida (¿falta npm ci?)');
  if (installed.includes(required)) return result(label, 'ok', required);
  return result(
    label,
    'warn',
    `Falta ${required}; Gradle la descarga en el primer build (unos 1,5 GB)`,
    `sdkmanager "ndk;${required}"`,
  );
}

/**
 * @param {string[]} installed versiones en `<SDK>/cmake`
 * @param {string} platform `process.platform`
 */
function evaluateCmake(installed, platform) {
  const label = 'CMake del SDK';
  const best = newestCompatibleCmake(installed);
  if (platform !== 'win32') {
    return result(label, 'ok', installed.length ? installed.join(', ') : 'Gradle lo descarga');
  }
  if (best) return result(label, 'ok', `${best} (ninja con rutas largas)`);
  return result(
    label,
    'fail',
    `${installed.join(', ') || 'ninguno'}: en Windows se necesita 3.31 o superior (AM-13)`,
    'sdkmanager "cmake;3.31.6"',
  );
}

/**
 * La versión de CMake más nueva que cumple el mínimo de Windows, o null.
 * @param {string[]} installed
 */
function newestCompatibleCmake(installed) {
  const parsed = installed
    .map((name) => ({ name, version: parseVersion(name) }))
    .filter((entry) => entry.version && compareVersions(entry.version, MIN_WINDOWS_CMAKE) >= 0);
  parsed.sort((a, b) =>
    compareVersions(/** @type {any} */ (b.version), /** @type {any} */ (a.version)),
  );
  return parsed[0]?.name ?? null;
}

/**
 * `android/local.properties` se genera y no está en git; en Windows debe fijar `cmake.dir`.
 * @param {{ androidDir: boolean, cmakeDir: string | null, cmakeDirExists: boolean }} props
 * @param {string} platform
 * @returns {CheckResult | null}
 */
function evaluateLocalProperties(props, platform) {
  if (platform !== 'win32') return null;
  const label = 'android/local.properties';
  const fix = 'npm run entorno:cmake';
  if (!props.androidDir) {
    return result(
      label,
      'warn',
      'Aún no existe android/: después de prebuild, fija cmake.dir',
      fix,
    );
  }
  if (!props.cmakeDir)
    return result(label, 'fail', 'Sin cmake.dir: Gradle usaría CMake 3.22 (AM-13)', fix);
  if (!props.cmakeDirExists)
    return result(label, 'fail', `cmake.dir no existe: ${props.cmakeDir}`, fix);
  return result(label, 'ok', `cmake.dir=${props.cmakeDir}`);
}

/** @param {number} freeBytes `os.freemem()` */
function evaluateMemory(freeBytes) {
  const label = 'Memoria libre';
  const detail = `${(freeBytes / GB).toFixed(1)} GB`;
  if (freeBytes >= RECOMMENDED_FREE_RAM_BYTES) return result(label, 'ok', detail);
  const fix = 'Cierra programas (y `wsl --shutdown`) antes de compilar';
  if (freeBytes >= MIN_FREE_RAM_BYTES) {
    return result(label, 'warn', `${detail}: alcanza para Gradle, justo con el emulador`, fix);
  }
  return result(label, 'fail', `${detail}: Gradle necesita unos 4 GB libres`, fix);
}

/**
 * @param {boolean | null} enabled valor de LongPathsEnabled; null si no se pudo leer
 * @param {string} platform
 * @returns {CheckResult | null}
 */
function evaluateLongPaths(enabled, platform) {
  if (platform !== 'win32') return null;
  const label = 'Rutas largas de Windows';
  if (enabled) return result(label, 'ok', 'LongPathsEnabled = 1');
  return result(
    label,
    'warn',
    enabled === null ? 'No se pudo leer LongPathsEnabled' : 'LongPathsEnabled = 0',
    'Como administrador: Set-ItemProperty HKLM:\\SYSTEM\\CurrentControlSet\\Control\\FileSystem LongPathsEnabled 1',
  );
}

module.exports = {
  evaluateNode,
  evaluateJava,
  evaluateJbr,
  evaluateSdk,
  evaluateNdk,
  evaluateCmake,
  newestCompatibleCmake,
  evaluateLocalProperties,
  evaluateMemory,
  evaluateLongPaths,
};
