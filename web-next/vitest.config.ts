import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(rootDir, '.')
    }
  },
  test: {
    exclude: [
      ...configDefaults.exclude,
      'scripts/*-browser-smoke.spec.ts',
      'components/pages/login-form.submit.test.tsx',
    ],
  },
});
