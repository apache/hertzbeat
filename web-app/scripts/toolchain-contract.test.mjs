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
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { assertRuntimeMajor, readToolchainRequirements } from './check-toolchain.mjs';

const packageManifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const preCommitHook = readFileSync(new URL('../../.githooks/pre-commit', import.meta.url), 'utf8');

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
