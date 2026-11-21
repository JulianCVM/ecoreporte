const checks = require('../checks');

const GB = 1024 ** 3;
const RN_RANGE = '^22.13.0 || ^24.3.0 || >= 26.0.0';

describe('evaluateNode', () => {
  it('bloquea con Node 20 y acepta Node 24', () => {
    expect(checks.evaluateNode('v20.20.2', RN_RANGE).status).toBe('fail');
    expect(checks.evaluateNode('v24.22.3', RN_RANGE).status).toBe('ok');
  });

  it('pide npm ci si no puede leer engines', () => {
    expect(checks.evaluateNode('v24.22.3', null)).toMatchObject({ status: 'fail', fix: 'npm ci' });
  });
});

describe('evaluateJava', () => {
  it('bloquea si java no arranca (JBR incompleto en JAVA_HOME)', () => {
    expect(checks.evaluateJava(null, 'C:\\jbr').status).toBe('fail');
  });

  it('bloquea con Java viejo y avisa con uno más nuevo que 21', () => {
    expect(checks.evaluateJava(17, 'C:\\jdk-17').status).toBe('fail');
    expect(checks.evaluateJava(25, 'C:\\jdk-25').status).toBe('warn');
  });

  it('avisa si Java 21 viene del PATH sin JAVA_HOME, y acepta JAVA_HOME con 21', () => {
    expect(checks.evaluateJava(21, null).status).toBe('warn');
    expect(checks.evaluateJava(21, 'C:\\jdk-21').status).toBe('ok');
  });
});

describe('evaluateJbr', () => {
  it('no reporta nada sin Android Studio en la ruta por defecto', () => {
    expect(checks.evaluateJbr({ exists: false, complete: false, path: 'x' })).toBeNull();
  });

  it('avisa si al JBR le falta lib/jvm.cfg', () => {
    expect(checks.evaluateJbr({ exists: true, complete: false, path: 'jbr' })?.status).toBe('warn');
    expect(checks.evaluateJbr({ exists: true, complete: true, path: 'jbr' })?.status).toBe('ok');
  });
});

describe('evaluateSdk', () => {
  it('bloquea sin SDK', () => {
    const [sdk] = checks.evaluateSdk(null, {
      platformTools: false,
      emulator: false,
      cmdlineTools: false,
    });
    expect(sdk.status).toBe('fail');
  });

  it('bloquea sin adb y solo avisa sin emulador ni cmdline-tools', () => {
    const results = checks.evaluateSdk('C:\\Sdk', {
      platformTools: false,
      emulator: false,
      cmdlineTools: false,
    });
    expect(results.map((entry) => entry.status)).toEqual(['ok', 'fail', 'warn', 'warn']);
  });
});

describe('evaluateNdk', () => {
  it('avisa si falta la versión exigida por React Native', () => {
    expect(checks.evaluateNdk('27.1.12297006', []).status).toBe('warn');
    expect(checks.evaluateNdk('27.1.12297006', ['27.1.12297006']).status).toBe('ok');
  });
});

describe('evaluateCmake y newestCompatibleCmake (AM-13)', () => {
  it('bloquea en Windows con solo CMake 3.22.1, el error del primer build', () => {
    expect(checks.evaluateCmake(['3.22.1'], 'win32').status).toBe('fail');
  });

  it('elige la versión compatible más nueva', () => {
    expect(checks.newestCompatibleCmake(['3.22.1', '3.31.6', '4.1.2', '3.31.0'])).toBe('4.1.2');
    expect(checks.newestCompatibleCmake(['3.22.1', '3.30.5'])).toBeNull();
  });

  it('no exige 3.31 fuera de Windows', () => {
    expect(checks.evaluateCmake(['3.22.1'], 'linux').status).toBe('ok');
  });
});

describe('evaluateLocalProperties', () => {
  it('bloquea en Windows si android/ existe sin cmake.dir válido', () => {
    const base = { androidDir: true, cmakeDirExists: false };
    expect(checks.evaluateLocalProperties({ ...base, cmakeDir: null }, 'win32')?.status).toBe(
      'fail',
    );
    expect(checks.evaluateLocalProperties({ ...base, cmakeDir: 'C:\\no' }, 'win32')?.status).toBe(
      'fail',
    );
  });

  it('acepta cmake.dir existente y solo avisa antes del prebuild', () => {
    const ok = { androidDir: true, cmakeDir: 'C:\\Sdk\\cmake\\3.31.6', cmakeDirExists: true };
    expect(checks.evaluateLocalProperties(ok, 'win32')?.status).toBe('ok');
    const noAndroid = { androidDir: false, cmakeDir: null, cmakeDirExists: false };
    expect(checks.evaluateLocalProperties(noAndroid, 'win32')?.status).toBe('warn');
  });

  it('no aplica fuera de Windows', () => {
    const props = { androidDir: true, cmakeDir: null, cmakeDirExists: false };
    expect(checks.evaluateLocalProperties(props, 'darwin')).toBeNull();
  });
});

describe('evaluatePortForwarding', () => {
  const ports = [9099, 8080, 9199];

  it('pide adb reverse si el host es 127.0.0.1 y faltan puertos', () => {
    const entry = checks.evaluatePortForwarding('127.0.0.1', ['emulator-5554'], [9099], ports);
    expect(entry).toMatchObject({ status: 'warn', fix: 'npm run android:puertos' });
    expect(entry?.detail).toContain('8080, 9199');
  });

  it('acepta los puertos completos', () => {
    expect(checks.evaluatePortForwarding('127.0.0.1', ['x'], ports, ports)?.status).toBe('ok');
  });

  it('no aplica con 10.0.2.2 ni sin dispositivos', () => {
    expect(checks.evaluatePortForwarding('10.0.2.2', ['x'], [], ports)).toBeNull();
    expect(checks.evaluatePortForwarding('127.0.0.1', [], [], ports)).toBeNull();
  });
});

describe('evaluateFirebaseEmulators', () => {
  it('lista los emuladores que no responden', () => {
    const entry = checks.evaluateFirebaseEmulators([
      { name: 'auth', port: 9099, open: true },
      { name: 'storage', port: 9199, open: false },
    ]);
    expect(entry.status).toBe('warn');
    expect(entry.detail).toContain('storage (9199)');
  });
});

describe('evaluateMemory', () => {
  it('usa los umbrales del README: 6 GB con emulador, 4 GB para Gradle', () => {
    expect(checks.evaluateMemory(8 * GB).status).toBe('ok');
    expect(checks.evaluateMemory(5 * GB).status).toBe('warn');
    expect(checks.evaluateMemory(1.8 * GB).status).toBe('fail');
  });
});

describe('evaluateConfigFiles', () => {
  it('bloquea sin .env ni google-services.json', () => {
    const results = checks.evaluateConfigFiles({
      env: false,
      googleServices: false,
      googleServicesPath: './google-services.json',
    });
    expect(results.map((entry) => entry.status)).toEqual(['fail', 'fail']);
  });
});
