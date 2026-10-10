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

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const manifestUrl = new URL('../package.json', import.meta.url);

/** Read the single supported major from the project's bounded engine range. */
export function readEngineMajor(range, runtime) {
  const match = /^>=(\d+)\s+<(\d+)$/.exec(range);
  if (!match || Number(match[2]) !== Number(match[1]) + 1) {
    throw new Error(`${runtime} engine must declare one supported major as ">=N <N+1"`);
  }
  return Number(match[1]);
}

/** Resolve runtime requirements from package.json and reject divergent declarations. */
export function readToolchainRequirements(manifest) {
  const node = readEngineMajor(manifest.engines?.node, 'Node.js');
  const pnpmEngine = readEngineMajor(manifest.engines?.pnpm, 'pnpm');
  const packageManagerMatch = /^pnpm@(\d+)(?:\.|$)/.exec(manifest.packageManager ?? '');

  if (!packageManagerMatch) {
    throw new Error('packageManager must declare pnpm with an explicit version');
  }

  const pnpm = Number(packageManagerMatch[1]);
  if (pnpm !== pnpmEngine) {
    throw new Error('packageManager and engines.pnpm must declare the same pnpm major');
  }
  return { node, pnpm };
}

/** Reject a runtime outside the major declared by package.json. */
export function assertRuntimeMajor(runtime, version, expectedMajor) {
  const actualMajor = Number.parseInt(version, 10);
  if (actualMajor !== expectedMajor) {
    throw new Error(`${runtime} ${expectedMajor}.x is required; found ${version}`);
  }
}

function fail(message) {
  process.stderr.write(`HertzBeat web-app toolchain check failed: ${message}\n`);
  process.exitCode = 1;
}

function run() {
  try {
    const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'));
    const requirements = readToolchainRequirements(manifest);

    // Check Node before invoking package-manager code with an unsupported runtime.
    assertRuntimeMajor('Node.js', process.versions.node, requirements.node);
    const pnpmVersion = execFileSync('pnpm', ['--version'], { encoding: 'utf8' }).trim();
    assertRuntimeMajor('pnpm', pnpmVersion, requirements.pnpm);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  run();
}
