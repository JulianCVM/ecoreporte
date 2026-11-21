// @ts-check
// Evaluaciones puras del estado de la sesión de trabajo: dispositivos, archivos de configuración,
// `adb reverse` y emuladores de Firebase. No tocan el disco ni la red.

const { result } = require('./check-result');

/** Hosts con los que el dispositivo solo llega al PC por `adb reverse`. */
const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost'];

/** @param {string[] | null} avds null si no se pudo ejecutar `emulator -list-avds` */
function evaluateAvds(avds) {
  const label = 'Dispositivos virtuales (AVD)';
  if (avds === null) return result(label, 'warn', 'No se pudo listar (falta el emulador)');
  if (avds.length) return result(label, 'ok', avds.join(', '));
  return result(
    label,
    'warn',
    'Ninguno (no hace falta con celular físico)',
    'Android Studio → Device Manager → crear uno con Android 36 x86_64',
  );
}

/** @param {string[] | null} devices seriales en estado `device` */
function evaluateDevices(devices) {
  const label = 'Dispositivo conectado';
  if (devices === null) return result(label, 'warn', 'No se pudo ejecutar adb');
  if (devices.length) return result(label, 'ok', devices.join(', '));
  return result(label, 'warn', 'Ninguno', 'emulator -avd <nombre>, o conecta el celular por USB');
}

/** @param {{ env: boolean, googleServices: boolean, googleServicesPath: string }} files */
function evaluateConfigFiles(files) {
  return [
    files.env
      ? result('.env', 'ok', 'existe')
      : result('.env', 'fail', 'falta', 'cp .env.example .env'),
    files.googleServices
      ? result('google-services.json', 'ok', files.googleServicesPath)
      : result(
          'google-services.json',
          'fail',
          `falta ${files.googleServicesPath}`,
          'Descárgalo de ecoreporte-dev (docs/04-infraestructura.md)',
        ),
  ];
}

/**
 * Con `EXPO_PUBLIC_EMULATOR_HOST=127.0.0.1`, cada dispositivo necesita `adb reverse` de los puertos.
 * @param {string | null} emulatorHost
 * @param {string[] | null} devices
 * @param {number[]} reversedPorts
 * @param {number[]} requiredPorts
 * @returns {CheckResult | null}
 */
function evaluatePortForwarding(emulatorHost, devices, reversedPorts, requiredPorts) {
  if (!emulatorHost || !LOOPBACK_HOSTS.includes(emulatorHost) || !devices?.length) return null;
  const label = 'adb reverse';
  const missing = requiredPorts.filter((port) => !reversedPorts.includes(port));
  if (!missing.length) return result(label, 'ok', requiredPorts.join(', '));
  return result(
    label,
    'warn',
    `EXPO_PUBLIC_EMULATOR_HOST=${emulatorHost} y faltan los puertos ${missing.join(', ')}`,
    'npm run android:puertos',
  );
}

/** @param {{ name: string, port: number, open: boolean }[]} ports */
function evaluateFirebaseEmulators(ports) {
  const closed = ports.filter((entry) => !entry.open);
  const label = 'Emulator Suite de Firebase';
  if (!closed.length) return result(label, 'ok', 'Auth, Firestore y Storage responden');
  const names = closed.map((entry) => `${entry.name} (${entry.port})`).join(', ');
  return result(label, 'warn', `No responden: ${names}`, 'npm run emulators');
}

module.exports = {
  evaluateAvds,
  evaluateDevices,
  evaluateConfigFiles,
  evaluatePortForwarding,
  evaluateFirebaseEmulators,
};
