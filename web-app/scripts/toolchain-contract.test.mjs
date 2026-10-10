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

import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { loadConfigFromFile } from 'vite';

import { assertRuntimeMajor, readToolchainRequirements } from './check-toolchain.mjs';
import vitestResourcePolicy from './vitest-resource-policy.json' with { type: 'json' };

const packageManifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const preCommitHook = readFileSync(new URL('../../.githooks/pre-commit', import.meta.url), 'utf8');

test('native test aliases resolve from the physical pnpm package without changing production aliases', async () => {
  const loaded = await loadConfigFromFile(
    { command: 'build', mode: 'production' },
    fileURLToPath(new URL('../vite.config.ts', import.meta.url))
  );
  const packageRequire = createRequire(
    realpathSync(new URL('../node_modules/@perses-dev/tracing-gantt-chart-plugin/package.json', import.meta.url))
  );
  for (const dependency of ['react-virtuoso', 'use-resize-observer']) {
    const alias = loaded.config.test.alias.find(item => item.find.test(dependency));
    assert.equal(realpathSync(alias.replacement), realpathSync(packageRequire.resolve(dependency)));
    assert.equal(loaded.config.resolve.alias[dependency], undefined);
  }
});

test('the application uses one exact React 18 runtime for embedded Perses', () => {
  assert.equal(packageManifest.dependencies.react, '18.3.1');
  assert.equal(packageManifest.dependencies['react-dom'], '18.3.1');
  assert.equal(packageManifest.devDependencies['@types/react'], '18.3.28');
  assert.equal(packageManifest.devDependencies['@types/react-dom'], '18.3.7');
  assert.equal(packageManifest.dependencies['@ant-design/v5-patch-for-react-19'], undefined);
});

test('the Perses runtime boundary uses fixed supported packages without deprecated core', () => {
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(packageManifest.dependencies)
        .filter(([name]) => name.startsWith('@perses-dev/'))
        .sort(([left], [right]) => left.localeCompare(right))
    ),
    {
      '@perses-dev/client': '0.54.0',
      '@perses-dev/components': '0.54.0',
      '@perses-dev/dashboards': '0.54.0',
      // plugin-system's published aggregate runtime resolves Explore even though
      // the HertzBeat snapshot adapter does not import or render Explore itself.
      '@perses-dev/explore': '0.54.0',
      '@perses-dev/gauge-chart-plugin': '0.13.0',
      '@perses-dev/logs-table-plugin': '0.3.0',
      '@perses-dev/plugin-system': '0.54.0',
      '@perses-dev/spec': '0.2.0',
      '@perses-dev/stat-chart-plugin': '0.14.0',
      '@perses-dev/table-plugin': '0.13.0',
      '@perses-dev/timeseries-chart-plugin': '0.13.0',
      '@perses-dev/trace-table-plugin': '0.11.0',
      '@perses-dev/tracing-gantt-chart-plugin': '0.13.0'
    }
  );
  assert.equal(packageManifest.dependencies['@perses-dev/core'], undefined);
  assert.deepEqual(packageManifest.knip.ignoreDependencies, ['@perses-dev/explore']);
});

test('the release gate checks formatting and the worktree diff without writing files', () => {
  assert.equal(packageManifest.scripts['format:check'], 'prettier --check .');
  assert.equal(packageManifest.scripts['diff:check'], 'cd .. && git diff --check');

  const verifySteps = packageManifest.scripts.verify.split('&&').map(step => step.trim());
  assert.equal(verifySteps[0], 'pnpm toolchain:check');
  assert.ok(verifySteps.includes('pnpm format:check'));
  assert.ok(verifySteps.includes('pnpm diff:check'));
  assert.ok(!verifySteps.includes('pnpm format'));
});

test('the pre-commit hook validates the declared toolchain before formatting staged files', () => {
  const toolchainCheck = preCommitHook.indexOf('node scripts/check-toolchain.mjs');
  const stagedFormatting = preCommitHook.indexOf('pnpm format:staged');

  assert.ok(toolchainCheck >= 0, 'pre-commit must validate the project toolchain');
  assert.ok(stagedFormatting > toolchainCheck, 'toolchain validation must run before staged formatting');
  assert.doesNotMatch(preCommitHook, /pnpm format(?:\s|$)/m);
});

test('toolchain requirements have one source of truth and reject unsupported majors', () => {
  const requirements = readToolchainRequirements(packageManifest);
  const declaredPnpmMajor = Number(/^pnpm@(\d+)/.exec(packageManifest.packageManager)?.[1]);

  assert.equal(requirements.pnpm, declaredPnpmMajor);
  assert.doesNotThrow(() => assertRuntimeMajor('Node.js', `${requirements.node}.0.0`, requirements.node));
  assert.throws(
    () => assertRuntimeMajor('Node.js', `${requirements.node - 1}.99.0`, requirements.node),
    new RegExp(`Node\\.js ${requirements.node}\\.x is required`)
  );
  assert.throws(
    () =>
      readToolchainRequirements({
        ...packageManifest,
        packageManager: `pnpm@${requirements.pnpm + 1}.0.0`
      }),
    /must declare the same pnpm major/
  );
});

test('the jsdom release gate keeps bounded parallelism and a bounded time budget', () => {
  assert.deepEqual(vitestResourcePolicy, {
    maxWorkers: 2,
    timeoutMilliseconds: 30_000
  });
});
