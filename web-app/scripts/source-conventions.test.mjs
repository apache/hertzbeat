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

test('rejects instrumentation primitive wire parsers and inline Query Keys', () => {
  const project = createProject({
    'src/app/main.ts': 'export {};',
    'src/core/http/client.ts': 'export {};',
    'src/layout/shell/shell.tsx': 'export const Shell = () => null;',
    'src/features/instrumentation/api/unsafe-parser.ts': 'function text(value) { return String(value); }',
    'src/features/instrumentation/controller/unsafe-query.ts': "export const query = { queryKey: ['instrumentation'] };",
    'src/shared/time/time.ts': 'export {};',
    'src/assets/i18n/en-us.json': '{}'
  });

  const failures = checkArchitecture(project).join('\n');
  assert.match(failures, /use runtime schemas instead of local primitive wire parsers/);
  assert.match(failures, /use the feature Query Key factory/);
});

test('rejects hand-written primitive contract parsers in core auth', () => {
  const project = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/index.ts': 'export {};',
    'src/core/auth/session-api.ts': [
      'function isRecord(value) { return Boolean(value); }',
      'const hasExactKeys = value => Boolean(value);',
      'function text(value) { return String(value); }'
    ].join('\n')
  });

  const failures = checkArchitecture(project).join('\n');
  assert.match(failures, /core auth contracts must use runtime schemas instead of primitive parser helpers/);
});

test('rejects oversized instrumentation modules and route-local color literals', () => {
  const project = createProject({
    'src/app/main.ts': 'export {};',
    'src/core/http/client.ts': 'export {};',
    'src/layout/shell/shell.tsx': 'export const Shell = () => null;',
    'src/features/instrumentation/pages/oversized-page.tsx': Array.from(
      { length: 151 },
      (_, index) => `export const line${index} = ${index};`
    ).join('\n'),
    'src/features/instrumentation/components/local-palette.module.css': '.panel { color: #ffffff; }',
    'src/shared/time/time.ts': 'export {};',
    'src/assets/i18n/en-us.json': '{}'
  });

  const failures = checkArchitecture(project).join('\n');
  assert.match(failures, /151 lines exceeds 150/);
  assert.match(failures, /use shared semantic color tokens/);
});

test('applies size, parser, Query Key, and raw-color rules to every feature', () => {
  const project = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/pages/orders-page.tsx': sourceLines(151),
    'src/features/orders/components/orders-table.tsx': sourceLines(201),
    'src/features/orders/controller/use-orders-controller.ts': sourceLines(201),
    'src/features/orders/api/orders-api.ts': `${sourceLines(251)}\nfunction text(value) { return String(value); }`,
    'src/features/orders/model/orders-model.ts': sourceLines(251),
    'src/features/orders/index.ts': sourceLines(101),
    'src/features/orders/controller/orders-query.ts': "export const query = { queryKey: ['orders'] };",
    'src/features/orders/components/orders.module.css': '.row { color: rgb(1, 2, 3); }'
  });

  const failures = checkArchitecture(project).join('\n');
  assert.match(failures, /features\/orders\/pages\/orders-page\.tsx: 151 lines exceeds 150/);
  assert.match(failures, /features\/orders\/components\/orders-table\.tsx: 201 lines exceeds 200/);
  assert.match(failures, /features\/orders\/controller\/use-orders-controller\.ts: 201 lines exceeds 200/);
  assert.match(failures, /features\/orders\/api\/orders-api\.ts: 252 lines exceeds 250/);
  assert.match(failures, /features\/orders\/model\/orders-model\.ts: 251 lines exceeds 250/);
  assert.match(failures, /features\/orders\/index\.ts: 101 lines exceeds 100/);
  assert.match(failures, /use runtime schemas instead of local primitive wire parsers/);
  assert.match(failures, /use the feature Query Key factory/);
  assert.match(failures, /use shared semantic color tokens/);
});

test('counts only non-empty non-comment module lines', () => {
  const project = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/pages/orders-page.tsx': [
      ...Array.from({ length: 150 }, (_, index) => `export const line${index} = ${index};`),
      '',
      '// a line comment is not code',
      '/* a block comment',
      '   spanning several physical lines */'
    ].join('\n')
  });

  assert.deepEqual(checkArchitecture(project), []);
});

test('preserves code around block comments and ignores violations inside test fixtures', () => {
  const project = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/pages/orders-page.tsx': [
      ...Array.from({ length: 147 }, (_, index) => `export const line${index} = ${index};`),
      'export const commentText = "/* remains code */";',
      'export const before = 1; /* ignored block comment',
      'ignored comment body */ export const after = 2;'
    ].join('\n'),
    'src/features/orders/api/unsafe-parser.test.ts': [
      ...Array.from({ length: 300 }, (_, index) => `export const fixture${index} = ${index};`),
      'function text(value) { return String(value); }',
      "export const query = { queryKey: ['fixture'] };"
    ].join('\n')
  });

  assert.deepEqual(checkArchitecture(project), []);
});

test('distinguishes TS comments and strings from parser and Query Key syntax', () => {
  const safe = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/api/orders-api.ts': [
      'export const parserExample = "function text(value) { return value; }";',
      'export const queryExample = "queryKey: [orders]";',
      '// function object(value) { return value; }',
      '/* queryKey: ["orders"] */'
    ].join('\n')
  });
  assert.deepEqual(checkArchitecture(safe), []);

  const unsafe = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/api/orders-api.ts': 'function text(value) { return String(value); }',
    'src/features/orders/controller/orders-query.ts': [
      "export const query = { queryKey: ['orders'] };",
      "export class QueryOwner { queryKey = ['orders', 'detail']; }"
    ].join('\n')
  });
  const failures = checkArchitecture(unsafe).join('\n');
  assert.match(failures, /use runtime schemas instead of local primitive wire parsers/);
  assert.match(failures, /use the feature Query Key factory/);
});

test('ignores CSS colors in comments but rejects colors in declarations', () => {
  const safe = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/components/orders.module.css': [
      '/* old colors: #fff, rgb(1, 2, 3), hsl(0, 0%, 0%) */',
      '.row { color: var(--hb-text-primary); }'
    ].join('\n')
  });
  assert.deepEqual(checkArchitecture(safe), []);

  const unsafe = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/components/orders.module.css': [
      '/* #fff does not count */',
      '.row { color: hsl(0, 0%, 0%); }'
    ].join('\n')
  });
  assert.match(checkArchitecture(unsafe).join('\n'), /use shared semantic color tokens/);
});

test('allows an exact baseline ceiling but rejects debt growth and new paths', () => {
  const accepted = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/pages/orders-page.tsx': sourceLines(151),
    'scripts/feature-debt-baseline.json': debtBaseline([
      { rule: 'feature-module-size', path: 'features/orders/pages/orders-page.tsx', allowedMax: 151 }
    ])
  });
  assert.deepEqual(checkArchitecture(accepted), []);

  const growth = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/pages/orders-page.tsx': sourceLines(152),
    'scripts/feature-debt-baseline.json': debtBaseline([
      { rule: 'feature-module-size', path: 'features/orders/pages/orders-page.tsx', allowedMax: 151 }
    ])
  });
  assert.match(checkArchitecture(growth).join('\n'), /baseline exceeded.*actual 152.*allowedMax 151/);

  const newPath = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/pages/orders-page.tsx': sourceLines(151),
    'src/features/orders/pages/new-page.tsx': sourceLines(151),
    'scripts/feature-debt-baseline.json': debtBaseline([
      { rule: 'feature-module-size', path: 'features/orders/pages/orders-page.tsx', allowedMax: 151 }
    ])
  });
  assert.match(checkArchitecture(newPath).join('\n'), /features\/orders\/pages\/new-page\.tsx: 151 lines exceeds 150/);
});

test('rejects a stale baseline after the violation is fixed', () => {
  const project = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/pages/orders-page.tsx': sourceLines(150),
    'scripts/feature-debt-baseline.json': debtBaseline([
      { rule: 'feature-module-size', path: 'features/orders/pages/orders-page.tsx', allowedMax: 151 }
    ])
  });

  assert.match(checkArchitecture(project).join('\n'), /stale baseline entry.*feature-module-size.*orders-page\.tsx/);
});

test('rejects wildcard, duplicate, unknown-rule, and missing-path baseline entries', () => {
  const project = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/pages/orders-page.tsx': sourceLines(151),
    'scripts/feature-debt-baseline.json': debtBaseline([
      { rule: 'feature-module-size', path: 'features/orders/pages/*.tsx', allowedMax: 151 },
      { rule: 'feature-module-size', path: 'features/orders/pages/orders-page.tsx', allowedMax: 151 },
      { rule: 'feature-module-size', path: 'features/orders/pages/orders-page.tsx', allowedMax: 151 },
      { rule: 'unknown-rule', path: 'features/orders/pages/orders-page.tsx', allowedMax: 1 },
      { rule: 'inline-query-key', path: 'features/orders/missing.ts', allowedMax: 1 }
    ])
  });

  const failures = checkArchitecture(project).join('\n');
  assert.match(failures, /baseline path must be exact.*\*/);
  assert.match(failures, /duplicate baseline entry.*feature-module-size.*orders-page\.tsx/);
  assert.match(failures, /unknown baseline rule.*unknown-rule/);
  assert.match(failures, /baseline path does not exist.*features\/orders\/missing\.ts/);
});

test('reports malformed baseline JSON without throwing', () => {
  const project = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/index.ts': 'export {};',
    'scripts/feature-debt-baseline.json': '{ not valid JSON'
  });

  assert.doesNotThrow(() => checkArchitecture(project));
  assert.deepEqual(checkArchitecture(project), [
    'scripts/feature-debt-baseline.json: baseline must be valid JSON'
  ]);
});

test('rejects parent, absolute, backslash, and non-feature baseline paths', () => {
  const project = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/pages/orders-page.tsx': sourceLines(151),
    'scripts/feature-debt-baseline.json': debtBaseline([
      { rule: 'feature-module-size', path: '../features/orders/pages/orders-page.tsx', allowedMax: 151 },
      { rule: 'feature-module-size', path: '/features/orders/pages/orders-page.tsx', allowedMax: 151 },
      { rule: 'feature-module-size', path: 'features/orders\\pages\\orders-page.tsx', allowedMax: 151 },
      { rule: 'feature-module-size', path: 'shared/orders-page.tsx', allowedMax: 151 }
    ])
  });

  const failures = checkArchitecture(project).join('\n');
  for (const path of [
    '../features/orders/pages/orders-page.tsx',
    '/features/orders/pages/orders-page.tsx',
    'features/orders\\pages\\orders-page.tsx',
    'shared/orders-page.tsx'
  ]) {
    assert.match(failures, new RegExp(`baseline path must be exact: ${escapeRegExp(path)}`));
  }
});

test('requires allowedMax to be a positive safe integer', () => {
  const project = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/pages/orders-page.tsx': sourceLines(151),
    'scripts/feature-debt-baseline.json': debtBaseline([
      { rule: 'feature-module-size', path: 'features/orders/pages/orders-page.tsx', allowedMax: 0 },
      { rule: 'primitive-wire-parser', path: 'features/orders/pages/orders-page.tsx', allowedMax: -1 },
      { rule: 'inline-query-key', path: 'features/orders/pages/orders-page.tsx', allowedMax: 1.5 },
      { rule: 'feature-css-raw-color', path: 'features/orders/pages/orders-page.tsx', allowedMax: 9_007_199_254_740_992 }
    ])
  });

  const failures = checkArchitecture(project).filter(failure => failure.includes('allowedMax'));
  assert.equal(failures.length, 4);
  failures.forEach(failure => assert.match(failure, /allowedMax must be a positive safe integer/));
});

function createProject(files) {
  const directory = mkdtempSync(join(tmpdir(), 'hertzbeat-source-rules-'));
  temporaryProjects.push(directory);
  Object.entries(files).forEach(([path, source]) => writeFile(directory, path, source));
  return directory;
}

function requiredProjectFiles() {
  return {
    'src/app/main.ts': 'export {};',
    'src/core/http/client.ts': 'export {};',
    'src/layout/shell/shell.tsx': 'export const Shell = () => null;',
    'src/shared/time/time.ts': 'export {};',
    'src/assets/i18n/en-us.json': '{}'
  };
}

function sourceLines(count) {
  return Array.from({ length: count }, (_, index) => `export const line${index} = ${index};`).join('\n');
}

function debtBaseline(entries) {
  return JSON.stringify({ version: 1, entries }, null, 2);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function writeFile(root, path, content) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}
