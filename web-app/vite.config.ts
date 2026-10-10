/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { createRequire } from 'node:module';
import { realpathSync } from 'node:fs';
import { configDefaults, defineConfig } from 'vitest/config';

import bundleLimits from './scripts/bundle-limits.json' with { type: 'json' };
import vitestResourcePolicy from './scripts/vitest-resource-policy.json' with { type: 'json' };

const backendOrigin = process.env.BACKEND_ORIGIN || 'http://127.0.0.1:1157';
const requireGanttDependency = createRequire(
  realpathSync(new URL('./node_modules/@perses-dev/tracing-gantt-chart-plugin/package.json', import.meta.url))
);
const backendProxy = {
  target: backendOrigin,
  changeOrigin: true,
  headers: {
    Origin: backendOrigin
  }
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 4200,
    proxy: {
      '/api': backendProxy
    }
  },
  preview: {
    port: 4210,
    proxy: {
      '/api': backendProxy
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    manifest: true,
    chunkSizeWarningLimit: bundleLimits.chunkWarningKilobytes,
    rolldownOptions: {
      output: {
        // Size-based vendor splitting can create circular chunks around CommonJS
        // packages. Preserve source initialization order so the production bundle
        // cannot execute React consumers before React itself is initialized.
        strictExecutionOrder: true,
        codeSplitting: {
          groups: [
            {
              // Keep the policy package-agnostic so dependency upgrades do not require
              // maintaining a fragile library list. The size window avoids both a
              // monolithic vendor bundle and dozens of tiny initial requests.
              name: 'vendor',
              test: /node_modules[\\/]/,
              minSize: bundleLimits.vendorChunkMinBytes,
              maxSize: bundleLimits.vendorChunkMaxBytes
            }
          ]
        }
      }
    }
  },
  test: {
    // Perses packages expose ESM through `module` but no exports map, so Node's
    // test loader otherwise selects their CJS graph and creates a second React
    // Query context. Production Vite already selects these ESM entries.
    alias: [
      {
        find: /^use-resize-observer$/,
        replacement: requireGanttDependency.resolve('use-resize-observer')
      },
      {
        find: /^react-virtuoso$/,
        replacement: requireGanttDependency.resolve('react-virtuoso')
      },
      {
        find: /^@perses-dev\/tracing-gantt-chart-plugin$/,
        replacement: fileURLToPath(
          new URL('./node_modules/@perses-dev/tracing-gantt-chart-plugin/lib/index.js', import.meta.url)
        )
      },
      {
        find: /^@perses-dev\/trace-table-plugin$/,
        replacement: fileURLToPath(
          new URL('./node_modules/@perses-dev/trace-table-plugin/lib/index.js', import.meta.url)
        )
      },
      {
        find: /^@perses-dev\/components$/,
        replacement: fileURLToPath(new URL('./node_modules/@perses-dev/components/dist/index.js', import.meta.url))
      },
      {
        find: /^@perses-dev\/dashboards$/,
        replacement: fileURLToPath(new URL('./node_modules/@perses-dev/dashboards/dist/index.js', import.meta.url))
      },
      {
        find: /^@perses-dev\/plugin-system$/,
        replacement: fileURLToPath(new URL('./node_modules/@perses-dev/plugin-system/dist/index.js', import.meta.url))
      }
    ],
    environment: 'jsdom',
    exclude: [...configDefaults.exclude, '.tmp/**', 'scripts/**', 'tests/browser/**'],
    maxWorkers: vitestResourcePolicy.maxWorkers,
    pool: 'forks',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    restoreMocks: true,
    testTimeout: vitestResourcePolicy.timeoutMilliseconds,
    hookTimeout: vitestResourcePolicy.timeoutMilliseconds
  }
});
