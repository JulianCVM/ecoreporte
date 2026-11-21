// @ts-check
// Forma común de un resultado del diagnóstico.

/**
 * @typedef {'ok' | 'warn' | 'fail'} Status
 * @typedef {{ label: string, status: Status, detail: string, fix?: string }} CheckResult
 */

/** @returns {CheckResult} */
function result(label, status, detail, fix) {
  return fix ? { label, status, detail, fix } : { label, status, detail };
}

module.exports = { result };
