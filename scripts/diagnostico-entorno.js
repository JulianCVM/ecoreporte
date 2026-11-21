#!/usr/bin/env node
// @ts-check
// Diagnóstico del entorno para compilar y probar EcoReporte en Android.
//
//   npm run entorno:diagnostico
//
// Revisa Node, Java, el SDK de Android (NDK, CMake y emulador), la configuración local, los
// dispositivos y los emuladores de Firebase. Dice qué falla y cómo arreglarlo, y termina con
// código 1 si algo bloquea el build. No cambia nada del sistema.

const os = require('node:os');
const path = require('node:path');

const checks = require('./env-doctor/checks');
const probes = require('./env-doctor/probes');

const ROOT = path.resolve(__dirname, '..');
/** Emuladores que usa la app hoy (package.json, script `emulators`). */
const APP_EMULATORS = ['auth', 'firestore', 'storage'];
const ICONS = { ok: '✅', warn: '⚠️ ', fail: '❌' };

/** Puertos de Auth, Firestore y Storage según firebase.json. */
function firebasePorts() {
  const config = JSON.parse(probes.readText(path.join(ROOT, 'firebase.json')) ?? '{}');
  return APP_EMULATORS.map((name) => ({ name, port: Number(config.emulators?.[name]?.port) }));
}

function configFiles() {
  const envText = probes.readText(path.join(ROOT, '.env'));
  const env = probes.parseKeyValues(envText);
  const googleServicesPath = env.GOOGLE_SERVICES_JSON || './google-services.json';
  return {
    env,
    files: {
      env: envText !== null,
      googleServices: probes.readText(path.resolve(ROOT, googleServicesPath)) !== null,
      googleServicesPath,
    },
  };
}

/** @param {string | null} sdk */
function androidChecks(sdk) {
  if (!sdk)
    return {
      results: checks.evaluateSdk(null, {
        platformTools: false,
        emulator: false,
        cmdlineTools: false,
      }),
      devices: null,
    };
  const devices = probes.probeDevices(sdk);
  const results = [
    ...checks.evaluateSdk(sdk, probes.probeSdkParts(sdk)),
    checks.evaluateNdk(probes.probeRequiredNdk(ROOT), probes.listDirs(path.join(sdk, 'ndk'))),
    checks.evaluateCmake(probes.listDirs(path.join(sdk, 'cmake')), process.platform),
    checks.evaluateLocalProperties(probes.probeLocalProperties(ROOT), process.platform),
    checks.evaluateAvds(probes.probeAvds(sdk)),
    checks.evaluateDevices(devices),
  ];
  return { results, devices };
}

async function collect() {
  const java = probes.probeJava();
  const sdk = probes.probeSdkPath();
  const android = androidChecks(sdk);
  const { env, files } = configFiles();
  const ports = firebasePorts();
  const portStatus = await Promise.all(
    ports.map(async (entry) => ({ ...entry, open: await probes.isPortOpen(entry.port) })),
  );
  return [
    checks.evaluateNode(process.version, probes.probeNodeEngines(ROOT)),
    checks.evaluateJava(java.major, java.javaHome),
    checks.evaluateJbr(probes.probeJbr()),
    ...android.results,
    ...checks.evaluateConfigFiles(files),
    checks.evaluatePortForwarding(
      env.EXPO_PUBLIC_EMULATOR_HOST ?? null,
      android.devices,
      sdk ? probes.probeReversedPorts(sdk) : [],
      ports.map((entry) => entry.port),
    ),
    checks.evaluateFirebaseEmulators(portStatus),
    checks.evaluateMemory(os.freemem()),
    checks.evaluateLongPaths(probes.probeLongPaths(), process.platform),
  ].filter((entry) => entry !== null);
}

/** @param {import('./env-doctor/checks').CheckResult[]} results */
function report(results) {
  const width = Math.max(...results.map((entry) => entry.label.length));
  console.log('\nDiagnóstico del entorno · EcoReporte\n');
  for (const entry of results) {
    console.log(`${ICONS[entry.status]} ${entry.label.padEnd(width)}  ${entry.detail}`);
    if (entry.fix && entry.status !== 'ok') console.log(`   ${' '.repeat(width)}  → ${entry.fix}`);
  }
  const failures = results.filter((entry) => entry.status === 'fail').length;
  const warnings = results.filter((entry) => entry.status === 'warn').length;
  console.log(`\n${failures} bloqueo(s) y ${warnings} aviso(s).`);
  return failures;
}

collect()
  .then((results) => {
    process.exitCode = report(results) > 0 ? 1 : 0;
  })
  .catch((error) => {
    console.error('El diagnóstico falló:', error);
    process.exitCode = 1;
  });
