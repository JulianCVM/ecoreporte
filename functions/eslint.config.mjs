// Configuración propia de functions/: el lint de la app (eslint-config-expo) no aplica al
// servidor, y la CI corre este paquete por separado (docs/04-infraestructura.md, CI/CD).
import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  { ignores: ['lib/', 'coverage/'] },
  js.configs.recommended,
  tseslint.configs.strict,
  prettierConfig,
]);
