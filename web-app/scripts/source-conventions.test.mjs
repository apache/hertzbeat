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
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, test } from 'node:test';

import { checkArchitecture } from './check-architecture.mjs';

const temporaryProjects = [];

afterEach(() => {
  temporaryProjects.splice(0).forEach(directory => rmSync(directory, { force: true, recursive: true }));
});

test('accepts the required source map and ignores local evidence', () => {
  const project = createProject({
    'src/app/main.ts': 'export {};',
    'src/core/http/client.ts': 'export {};',
    'src/layout/shell/shell.tsx': 'export const Shell = () => null;',
    'src/features/orders/pages/orders-page.tsx': 'export const OrdersPage = () => null;',
    'src/shared/time/time.ts': 'export {};',
    'src/assets/i18n/en-us.json': '{}',
    'src/.tmp/BadEvidence.ts': 'export {};'
  });

  assert.deepEqual(checkArchitecture(project), []);
});

test('rejects unreadable paths, forbidden debt folders, and presentation transport', () => {
  const project = createProject({
    'src/app/main.ts': 'export {};',
    'src/core/http/client.ts': 'export {};',
    'src/layout/shell/shell.tsx': 'export const Shell = () => null;',
    'src/features/orders/pages/BadPage.tsx': 'export const BadPage = () => fetch("/api/orders");',
    'src/features/orders/legacy/order.ts': 'export {};',
    'src/shared/time/time.ts': 'export {};',
    'src/assets/i18n/en-us.json': '{}'
  });

  const failures = checkArchitecture(project).join('\n');
  assert.match(failures, /source files must use kebab-case/);
  assert.match(failures, /forbidden directory segment 'legacy'/);
  assert.match(failures, /pages and components cannot own transport/);
});

test('rejects instrumentation persistence and logging sinks', () => {
  const project = createProject({
    'src/app/main.ts': 'export {};',
    'src/core/http/client.ts': 'export {};',
    'src/layout/shell/shell.tsx': 'export const Shell = () => null;',
    'src/features/instrumentation/model/unsafe.ts': 'localStorage.setItem("token", token); console.log(token);',
    'src/shared/time/time.ts': 'export {};',
    'src/assets/i18n/en-us.json': '{}'
  });

  const failures = checkArchitecture(project).join('\n');
  assert.match(failures, /cannot persist onboarding state or secrets/);
  assert.match(failures, /cannot log or analyze onboarding state or secrets/);
});

function createProject(files) {
  const directory = mkdtempSync(join(tmpdir(), 'hertzbeat-source-rules-'));
  temporaryProjects.push(directory);
  Object.entries(files).forEach(([path, source]) => writeFile(directory, path, source));
  return directory;
}

function writeFile(root, path, content) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}
