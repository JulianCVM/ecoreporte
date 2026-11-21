// @ts-check
// CommonJS a propósito: el diagnóstico tiene que correr con cualquier Node, incluso con uno
// que no cumple `engines`, para poder decir qué está mal.

/** @typedef {[number, number, number]} Version */

/**
 * Extrae la primera versión numérica de un texto: `v24.3.0`, `21.0.2`, `cmake version 3.31.6`.
 * @param {string} text
 * @returns {Version | null}
 */
function parseVersion(text) {
  const match = /(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(String(text));
  if (!match) return null;
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}

/**
 * Compara dos versiones. Negativo si `a < b`, 0 si son iguales, positivo si `a > b`.
 * @param {Version} a
 * @param {Version} b
 */
function compareVersions(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/**
 * @param {Version} version
 * @param {string} comparator `^x.y.z`, `>=x.y.z` o `x.y.z`
 */
function satisfiesComparator(version, comparator) {
  const operator = comparator.startsWith('>=') ? '>=' : comparator.startsWith('^') ? '^' : '=';
  const bound = parseVersion(comparator);
  if (!bound) return false;
  const diff = compareVersions(version, bound);
  if (operator === '>=') return diff >= 0;
  if (operator === '^') return version[0] === bound[0] && diff >= 0;
  return diff === 0;
}

/**
 * Comprueba un rango de `engines` como el de React Native: `^22.13.0 || ^24.3.0 || >= 26.0.0`.
 * Solo entiende `||`, `^`, `>=` y versiones exactas, que es lo que usan Expo y React Native.
 * @param {Version} version
 * @param {string} range
 */
function satisfiesRange(version, range) {
  return range
    .split('||')
    .map((part) => part.replace(/\s+/g, ''))
    .filter(Boolean)
    .some((part) => satisfiesComparator(version, part));
}

/**
 * Versión mayor de Java a partir de la salida de `java -version`.
 * Java 8 y anteriores se anuncian como `1.8.0_x`.
 * @param {string} output
 * @returns {number | null}
 */
function parseJavaMajor(output) {
  const match = /version "([^"]+)"/.exec(String(output));
  if (!match) return null;
  const version = parseVersion(match[1]);
  if (!version) return null;
  return version[0] === 1 ? version[1] : version[0];
}

module.exports = { parseVersion, compareVersions, satisfiesRange, parseJavaMajor };
