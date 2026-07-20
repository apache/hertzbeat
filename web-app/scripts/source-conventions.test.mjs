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
    'src/features/instrumentation/controller/unsafe-query.ts':
      "export const query = { queryKey: ['instrumentation'] };",
    'src/shared/time/time.ts': 'export {};',
    'src/assets/i18n/en-us.json': '{}'
  });

  const failures = checkArchitecture(project).join('\n');
  assert.match(failures, /use runtime schemas instead of local primitive wire parsers/);
  assert.match(failures, /use the feature Query Key factory/);
});

test('rejects inline Query Keys passed directly to QueryClient cache methods', () => {
  const inlineCalls = [
    "queryClient.getQueryData(['orders']);",
    "queryClient.getQueryDefaults(['orders']);",
    "queryClient.getQueryState(['orders']);",
    "queryClient.setQueryData(['orders'], []);",
    "queryClient.setQueryDefaults(['orders'], {});",
    "queryClient['setQueryData'](['orders'], []);"
  ];

  for (const call of inlineCalls) {
    const project = createProject({
      ...requiredProjectFiles(),
      'src/features/orders/controller/orders-cache.ts': call
    });
    assert.match(checkArchitecture(project).join('\n'), /use the feature Query Key factory/, call);
  }

  const factoryOwned = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/controller/orders-cache.ts': 'queryClient.setQueryData(orderQueryKeys.all(), []);'
  });
  assert.deepEqual(checkArchitecture(factoryOwned), []);
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

test('requires Refine data providers to use the shared generic adapter boundary', () => {
  const project = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/index.ts': 'export {};',
    'src/app/refine/resources/order-data-provider.ts': [
      'function exposeProviderData<TData>(value: unknown): TData {',
      '  return value as unknown as TData;',
      '}',
      'export const orderDataProvider = exposeProviderData({ id: 1 });'
    ].join('\n'),
    'src/app/refine/resources/customer-data-provider.ts':
      'export const customerDataProvider = <TData>(value: unknown) => value as TData;'
  });

  const failures = checkArchitecture(project).join('\n');
  assert.match(failures, /Refine data providers must use the shared generic adapter boundary/);
  assert.match(failures, /Refine data providers cannot declare local generic adapter helpers/);
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

test('applies the controller limit to explicitly named feature-root controllers', () => {
  const project = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/orders-controller.ts': sourceLines(201),
    'src/features/orders/orders-controller-adapter.ts': sourceLines(201)
  });

  const failures = checkArchitecture(project).join('\n');
  assert.match(failures, /features\/orders\/orders-controller\.ts: 201 lines exceeds 200/);
  assert.doesNotMatch(failures, /orders-controller-adapter\.ts/);
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

  const reduced = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/pages/orders-page.tsx': sourceLines(151),
    'scripts/feature-debt-baseline.json': debtBaseline([
      { rule: 'feature-module-size', path: 'features/orders/pages/orders-page.tsx', allowedMax: 152 }
    ])
  });
  assert.match(checkArchitecture(reduced).join('\n'), /stale baseline ceiling.*actual 151.*allowedMax 152/);

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
  assert.deepEqual(checkArchitecture(project), ['scripts/feature-debt-baseline.json: baseline must be valid JSON']);
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
      {
        rule: 'feature-css-raw-color',
        path: 'features/orders/pages/orders-page.tsx',
        allowedMax: 9_007_199_254_740_992
      }
    ])
  });

  const failures = checkArchitecture(project).filter(failure => failure.includes('allowedMax'));
  assert.equal(failures.length, 4);
  failures.forEach(failure => assert.match(failure, /allowedMax must be a positive safe integer/));
});

test('rejects oversized production functions by AST identity while ignoring comments and tests', () => {
  const project = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/model/orders.ts': oversizedFunction('loadOrders', 59),
    'src/features/orders/model/orders.test.ts': oversizedFunction('testFixture', 80)
  });

  const failures = checkArchitecture(project).join('\n');
  assert.match(failures, /features\/orders\/model\/orders\.ts.*function:loadOrders.*61 lines exceeds 60/);
  assert.doesNotMatch(failures, /testFixture/);
});

test('uses an exact function baseline and rejects growth, reduction, and sibling debt', () => {
  const entry = {
    rule: 'function-size',
    path: 'features/orders/model/orders.ts',
    identity: 'function:loadOrders',
    allowedMax: 62
  };
  const accepted = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/model/orders.ts': oversizedFunction('loadOrders', 60),
    'scripts/function-debt-baseline.json': functionDebtBaseline([entry])
  });
  assert.deepEqual(checkArchitecture(accepted), []);

  const growth = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/model/orders.ts': oversizedFunction('loadOrders', 61),
    'scripts/function-debt-baseline.json': functionDebtBaseline([entry])
  });
  assert.match(checkArchitecture(growth).join('\n'), /function baseline exceeded.*actual 63.*allowedMax 62/);

  const reduction = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/model/orders.ts': oversizedFunction('loadOrders', 59),
    'scripts/function-debt-baseline.json': functionDebtBaseline([entry])
  });
  assert.match(checkArchitecture(reduction).join('\n'), /stale function baseline.*actual 61.*allowedMax 62/);

  const sibling = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/model/orders.ts': [
      oversizedFunction('loadOrders', 60),
      oversizedFunction('loadMoreOrders', 59)
    ].join('\n'),
    'scripts/function-debt-baseline.json': functionDebtBaseline([entry])
  });
  assert.match(checkArchitecture(sibling).join('\n'), /function:loadMoreOrders.*61 lines exceeds 60/);
});

test('rejects malformed, wildcard, duplicate, declaration, and weak function baselines', () => {
  const path = 'features/orders/model/orders.ts';
  const identity = 'function:loadOrders';
  const project = createProject({
    ...requiredProjectFiles(),
    [`src/${path}`]: oversizedFunction('loadOrders', 60),
    'src/features/orders/model/generated.d.ts': 'export declare function generated(): void;',
    'scripts/function-debt-baseline.json': functionDebtBaseline([
      { rule: 'unknown', path, identity, allowedMax: 62 },
      { rule: 'function-size', path, identity: 'function:*', allowedMax: 62 },
      { rule: 'function-size', path, identity, allowedMax: 62 },
      { rule: 'function-size', path, identity, allowedMax: 62 },
      {
        rule: 'function-size',
        path: 'features/orders/model/generated.d.ts',
        identity: 'function:generated',
        allowedMax: 62
      },
      { rule: 'function-size', path, identity: 'function:weak', allowedMax: 60 }
    ])
  });

  const failures = checkArchitecture(project).join('\n');
  assert.match(failures, /unknown baseline rule 'unknown'/);
  assert.match(failures, /function identity must be exact: function:\*/);
  assert.match(failures, /duplicate function baseline/);
  assert.match(failures, /must name an exact production TypeScript source.*generated\.d\.ts/);
  assert.match(failures, /allowedMax must be a safe integer above 60/);
});

test('rejects generic feature hooks through exact production-file debt entries', () => {
  const existingEntry = {
    rule: 'generic-hooks-file',
    path: 'features/orders/hooks/use-orders.ts',
    allowedMax: 1
  };
  const accepted = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/hooks/use-orders.ts': 'export const useOrders = () => null;',
    'scripts/feature-debt-baseline.json': debtBaseline([existingEntry])
  });
  assert.deepEqual(checkArchitecture(accepted), []);

  const newDebt = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/hooks/use-orders.ts': 'export const useOrders = () => null;',
    'src/features/orders/hooks/use-order-detail.ts': 'export const useOrderDetail = () => null;',
    'scripts/feature-debt-baseline.json': debtBaseline([existingEntry])
  });
  assert.match(
    checkArchitecture(newDebt).join('\n'),
    /use-order-detail\.ts: generic feature hooks directories are forbidden/
  );
});

test('enforces feature presentation, model, and public API dependency boundaries', () => {
  const project = createProject({
    ...requiredProjectFiles(),
    'src/features/orders/api/orders-api.ts': [
      'export type OrderDto = { id: number };',
      'export const loadOrders = () => [];'
    ].join('\n'),
    'src/features/orders/orders-page.tsx':
      "import { loadOrders } from './api/orders-api'; export const OrdersPage = () => String(loadOrders());",
    'src/features/orders/components/orders-table.tsx':
      "import type { OrderDto } from '../api/orders-api'; export const OrdersTable = (_props: { order: OrderDto }) => null;",
    'src/features/orders/model/orders.ts':
      "import type { OrderDto } from '../api/orders-api'; export type Order = OrderDto;",
    'src/features/billing/api/billing-api.ts': 'export const loadBilling = true;',
    'src/features/billing/index.ts': "export { loadBilling } from './api/billing-api';",
    'src/features/orders/controller/orders-controller.ts': [
      "import { loadBilling } from '@/features/billing/api/billing-api';",
      'export const useOrders = () => loadBilling;'
    ].join('\n')
  });

  const failures = checkArchitecture(project).join('\n');
  assert.match(
    failures,
    /orders-table\.tsx.*presentation cannot depend on feature API.*features\/orders\/api\/orders-api/
  );
  assert.match(
    failures,
    /orders-page\.tsx.*presentation cannot depend on feature API.*features\/orders\/api\/orders-api/
  );
  assert.match(failures, /model\/orders\.ts.*model cannot depend on feature API.*features\/orders\/api\/orders-api/);
  assert.match(
    failures,
    /orders-controller\.ts.*cross-feature imports must use the target public API.*features\/billing\/api\/billing-api/
  );

  const publicApi = createProject({
    ...requiredProjectFiles(),
    'src/features/billing/index.ts': 'export const loadBilling = true;',
    'src/features/orders/controller/orders-controller.ts':
      "import { loadBilling } from '@/features/billing'; export const useOrders = () => loadBilling;"
  });
  assert.deepEqual(checkArchitecture(publicApi), []);
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

function functionDebtBaseline(entries) {
  return JSON.stringify({ version: 1, entries }, null, 2);
}

function oversizedFunction(name, statementCount) {
  return [
    `export function ${name}() {`,
    ...Array.from({ length: statementCount }, (_, index) => `  const value${index} = ${index};`),
    '}'
  ].join('\n');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function writeFile(root, path, content) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}
