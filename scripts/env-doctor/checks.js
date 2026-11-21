// @ts-check
// Todas las evaluaciones del diagnóstico en un solo módulo, para el comando y las pruebas.

/** @typedef {import('./check-result').CheckResult} CheckResult */

module.exports = {
  ...require('./toolchain-checks'),
  ...require('./session-checks'),
};
