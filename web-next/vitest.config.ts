import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@hertzbeat/ui/shell': resolve(rootDir, 'packages/hertzbeat-ui/src/shell'),
      '@hertzbeat/ui/topology': resolve(rootDir, 'packages/hertzbeat-ui/src/topology'),
      '@hertzbeat/ui/topology-g6': resolve(rootDir, 'packages/hertzbeat-ui/src/topology-g6'),
      '@hertzbeat/ui': resolve(rootDir, 'packages/hertzbeat-ui/src'),
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
