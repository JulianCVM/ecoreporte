// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*', 'functions/*', 'coverage/*'],
  },
  {
    // Los scripts del entorno son CommonJS que corre Node directamente, fuera de Metro.
    files: ['scripts/**/*.js'],
    languageOptions: { globals: { __dirname: 'readonly' } },
  },
  {
    // Sus pruebas son .js (no TypeScript), así que no reciben los tipos de Jest de tsconfig.
    files: ['scripts/**/__tests__/**/*.js'],
    languageOptions: { globals: { describe: 'readonly', it: 'readonly', expect: 'readonly' } },
  },
]);
