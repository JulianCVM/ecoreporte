const { compareVersions, parseJavaMajor, parseVersion, satisfiesRange } = require('../versions');

// Rango real de engines.node de react-native 0.88.
const RN_RANGE = '^22.13.0 || ^24.3.0 || >= 26.0.0';

describe('parseVersion', () => {
  it('lee versiones con prefijo y texto alrededor', () => {
    expect(parseVersion('v24.22.3')).toEqual([24, 22, 3]);
    expect(parseVersion('cmake version 3.31.6')).toEqual([3, 31, 6]);
    expect(parseVersion('27.1.12297006')).toEqual([27, 1, 12297006]);
  });

  it('completa con ceros y devuelve null sin números', () => {
    expect(parseVersion('21')).toEqual([21, 0, 0]);
    expect(parseVersion('sin versión')).toBeNull();
  });
});

describe('compareVersions', () => {
  it('compara por mayor, menor y parche', () => {
    expect(compareVersions([3, 31, 6], [3, 22, 1])).toBeGreaterThan(0);
    expect(compareVersions([3, 22, 1], [3, 31, 0])).toBeLessThan(0);
    expect(compareVersions([4, 0, 0], [4, 0, 0])).toBe(0);
  });
});

describe('satisfiesRange', () => {
  it('rechaza Node 20, el error que bloqueó el entorno del segundo PC', () => {
    expect(satisfiesRange([20, 20, 2], RN_RANGE)).toBe(false);
  });

  it('acepta las versiones dentro de cada alternativa', () => {
    expect(satisfiesRange([22, 13, 0], RN_RANGE)).toBe(true);
    expect(satisfiesRange([24, 22, 3], RN_RANGE)).toBe(true);
    expect(satisfiesRange([27, 0, 0], RN_RANGE)).toBe(true);
  });

  it('respeta el mínimo de cada ^ y no cruza de versión mayor', () => {
    expect(satisfiesRange([22, 12, 0], RN_RANGE)).toBe(false);
    expect(satisfiesRange([24, 2, 0], RN_RANGE)).toBe(false);
    expect(satisfiesRange([25, 0, 0], RN_RANGE)).toBe(false);
  });

  it('acepta versiones exactas', () => {
    expect(satisfiesRange([24, 3, 0], '24.3.0')).toBe(true);
    expect(satisfiesRange([24, 3, 1], '24.3.0')).toBe(false);
  });
});

describe('parseJavaMajor', () => {
  it('lee Oracle, OpenJDK y el formato 1.x de Java 8', () => {
    expect(parseJavaMajor('java version "21.0.2" 2024-01-16 LTS')).toBe(21);
    expect(parseJavaMajor('openjdk version "25" 2025-09-16')).toBe(25);
    expect(parseJavaMajor('java version "1.8.0_421"')).toBe(8);
  });

  it('devuelve null si java no arrancó, como con el JBR incompleto', () => {
    expect(parseJavaMajor("Error: could not open `C:\\jbr\\lib\\jvm.cfg'")).toBeNull();
  });
});
