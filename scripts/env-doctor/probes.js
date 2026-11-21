// @ts-check
// Sondas del diagnóstico: leen el disco, ejecutan herramientas y prueban puertos. No deciden nada:
// devuelven hechos (o null si la herramienta no está) para que checks.js los evalúe.

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const { parseJavaMajor } = require('./versions');

const IS_WINDOWS = process.platform === 'win32';
/** Tiempo máximo para `java`, `adb` o `emulator`; si se cuelgan, el diagnóstico sigue. */
const COMMAND_TIMEOUT_MS = 15_000;
/** Tiempo máximo para saber si un emulador de Firebase escucha en su puerto local. */
const PORT_TIMEOUT_MS = 1_000;

/** @param {string} name */
function executable(name) {
  return IS_WINDOWS ? `${name}.exe` : name;
}

/**
 * Ejecuta un comando y devuelve stdout + stderr juntos: `java -version` escribe en stderr, y un
 * java roto explica su error también ahí.
 * @param {string} file
 * @param {string[]} args
 * @returns {string | null} null si el comando no existe o no dijo nada: la evaluación lo reporta
 */
function run(file, args) {
  const child = spawnSync(file, args, {
    encoding: 'utf8',
    timeout: COMMAND_TIMEOUT_MS,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  if (child.error) return null;
  const output = `${child.stdout ?? ''}${child.stderr ?? ''}`;
  return output.trim() ? output : null;
}

/** @param {string} file */
function readText(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

/** @param {string} dir */
function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/**
 * Lee un archivo `CLAVE=valor` (.env o local.properties). Sin comillas ni expansión.
 * @param {string | null} text
 * @returns {Record<string, string>}
 */
function parseKeyValues(text) {
  /** @type {Record<string, string>} */
  const values = {};
  for (const line of (text ?? '').split(/\r?\n/)) {
    const match = /^\s*([\w.]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (match && !line.trim().startsWith('#')) values[match[1]] = match[2];
  }
  return values;
}

/** @param {string} root */
function probeNodeEngines(root) {
  const text = readText(path.join(root, 'node_modules/react-native/package.json'));
  return text ? (JSON.parse(text).engines?.node ?? null) : null;
}

/** `ndkVersion` del catálogo de versiones de React Native. @param {string} root */
function probeRequiredNdk(root) {
  const text = readText(path.join(root, 'node_modules/react-native/gradle/libs.versions.toml'));
  return text ? (/^ndkVersion\s*=\s*"([^"]+)"/m.exec(text)?.[1] ?? null) : null;
}

function probeJava() {
  const javaHome = process.env.JAVA_HOME || null;
  const java = javaHome ? path.join(javaHome, 'bin', executable('java')) : 'java';
  const output = run(java, ['-version']);
  return { javaHome, major: output ? parseJavaMajor(output) : null };
}

function probeJbr() {
  const base = IS_WINDOWS
    ? path.join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Android', 'Android Studio', 'jbr')
    : '/Applications/Android Studio.app/Contents/jbr/Contents/Home';
  return {
    path: base,
    exists: fs.existsSync(base),
    complete: fs.existsSync(path.join(base, 'lib', 'jvm.cfg')),
  };
}

/** ANDROID_HOME, ANDROID_SDK_ROOT o la ruta por defecto de Android Studio. */
function probeSdkPath() {
  const defaults = IS_WINDOWS
    ? [path.join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk')]
    : [path.join(os.homedir(), 'Library/Android/sdk'), path.join(os.homedir(), 'Android/Sdk')];
  const candidates = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, ...defaults];
  return candidates.find((dir) => dir && fs.existsSync(dir)) ?? null;
}

/** @param {string} sdk */
function probeSdkParts(sdk) {
  const tool = IS_WINDOWS ? 'sdkmanager.bat' : 'sdkmanager';
  return {
    platformTools: fs.existsSync(path.join(sdk, 'platform-tools', executable('adb'))),
    emulator: fs.existsSync(path.join(sdk, 'emulator', executable('emulator'))),
    cmdlineTools: fs.existsSync(path.join(sdk, 'cmdline-tools', 'latest', 'bin', tool)),
  };
}

/** @param {string} sdk */
function probeAvds(sdk) {
  const output = run(path.join(sdk, 'emulator', executable('emulator')), ['-list-avds']);
  if (output === null) return null;
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^(INFO|WARNING|ERROR)\b/.test(line));
}

/** @param {string} sdk */
function probeDevices(sdk) {
  const output = run(path.join(sdk, 'platform-tools', executable('adb')), ['devices']);
  if (output === null) return null;
  return output
    .split(/\r?\n/)
    .map((line) => /^(\S+)\s+device$/.exec(line.trim())?.[1])
    .filter((serial) => typeof serial === 'string');
}

/** Puertos locales con `adb reverse` activo. @param {string} sdk */
function probeReversedPorts(sdk) {
  const output =
    run(path.join(sdk, 'platform-tools', executable('adb')), ['reverse', '--list']) ?? '';
  return [...output.matchAll(/tcp:(\d+)\s+tcp:\d+/g)].map((match) => Number(match[1]));
}

/** @param {string} root */
function probeLocalProperties(root) {
  const androidDir = fs.existsSync(path.join(root, 'android'));
  const props = parseKeyValues(readText(path.join(root, 'android', 'local.properties')));
  // local.properties es formato de Java: las barras invertidas van escapadas (C:\\Users\\...).
  const cmakeDir = props['cmake.dir']?.replace(/\\\\/g, '\\') ?? null;
  return { androidDir, cmakeDir, cmakeDirExists: cmakeDir ? fs.existsSync(cmakeDir) : false };
}

/** @returns {boolean | null} */
function probeLongPaths() {
  if (!IS_WINDOWS) return null;
  const output = run('reg', [
    'query',
    'HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem',
    '/v',
    'LongPathsEnabled',
  ]);
  const match = output ? /LongPathsEnabled\s+REG_DWORD\s+0x(\d+)/.exec(output) : null;
  return match ? match[1] !== '0' : null;
}

/**
 * @param {number} port
 * @returns {Promise<boolean>} true si algo escucha en 127.0.0.1:port
 */
function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    const finish = (/** @type {boolean} */ open) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(PORT_TIMEOUT_MS, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

module.exports = {
  parseKeyValues,
  readText,
  listDirs,
  probeNodeEngines,
  probeRequiredNdk,
  probeJava,
  probeJbr,
  probeSdkPath,
  probeSdkParts,
  probeAvds,
  probeDevices,
  probeReversedPorts,
  probeLocalProperties,
  probeLongPaths,
  isPortOpen,
};
