#!/usr/bin/env node
// @ts-check
// Fija en android/local.properties el CMake más nuevo del SDK que soporta rutas largas (AM-13).
//
//   npm run entorno:cmake
//
// android/ se genera con prebuild y local.properties está fuera de git, así que esto se repite
// después de cada `expo prebuild --clean`. Conserva las demás claves del archivo.

const fs = require('node:fs');
const path = require('node:path');

const { newestCompatibleCmake } = require('./env-doctor/checks');
const { listDirs, parseKeyValues, probeSdkPath, readText } = require('./env-doctor/probes');

const ROOT = path.resolve(__dirname, '..');
const LOCAL_PROPERTIES = path.join(ROOT, 'android', 'local.properties');

/** local.properties es formato de Java: la barra invertida se escribe doble. @param {string} value */
function escapeJavaProperty(value) {
  return value.replace(/\\/g, '\\\\');
}

function main() {
  const sdk = probeSdkPath();
  if (!sdk) throw new Error('No se encontró el SDK de Android (ANDROID_HOME vacío)');
  if (!fs.existsSync(path.join(ROOT, 'android'))) {
    throw new Error('No existe android/: corre antes `npx expo prebuild --platform android`');
  }
  const cmake = newestCompatibleCmake(listDirs(path.join(sdk, 'cmake')));
  if (!cmake) throw new Error('No hay CMake 3.31 o superior en el SDK: sdkmanager "cmake;3.31.6"');

  const props = parseKeyValues(readText(LOCAL_PROPERTIES));
  props['sdk.dir'] ??= escapeJavaProperty(sdk);
  props['cmake.dir'] = escapeJavaProperty(path.join(sdk, 'cmake', cmake));
  const text = Object.entries(props)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  fs.writeFileSync(LOCAL_PROPERTIES, `${text}\n`, 'ascii');
  console.log(`cmake.dir → CMake ${cmake} en ${path.relative(ROOT, LOCAL_PROPERTIES)}`);
}

try {
  main();
} catch (error) {
  console.error(`No se pudo fijar cmake.dir: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
