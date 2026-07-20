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
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, test } from 'node:test';

const projectRoot = resolve(import.meta.dirname, '..');
const dependencyCruiser = join(projectRoot, 'node_modules', '.bin', 'depcruise');
const configuration = join(projectRoot, 'dependency-cruiser.config.cjs');
const temporaryProjects = [];

afterEach(() => {
  temporaryProjects.splice(0).forEach(directory => rmSync(directory, { force: true, recursive: true }));
});

test('accepts the documented inward dependency direction', () => {
  const fixture = createProject({
    'src/core/http/client.ts': 'export const client = true;',
    'src/features/instrumentation/api/instrumentation-api.ts':
      "import { client } from '@/core/http/client'; export const load = () => client;",
    'src/features/instrumentation/model/instrumentation-model.ts': 'export type Guide = { id: string };',
    'src/features/instrumentation/controller/instrumentation-controller.ts':
      "import { load } from '../api/instrumentation-api'; export const useGuide = load;",
    'src/features/instrumentation/components/instrumentation-guide.tsx':
      "import type { Guide } from '../model/instrumentation-model'; export const InstrumentationGuide = (_props: { guide: Guide }) => null;",
    'src/features/instrumentation/pages/instrumentation-page.tsx':
      "import { InstrumentationGuide } from '../components/instrumentation-guide'; import { useGuide } from '../controller/instrumentation-controller'; export const InstrumentationPage = () => <InstrumentationGuide guide={{ id: String(useGuide()) }} />;"
  });

  const result = cruise(fixture);

  assert.equal(result.status, 0, result.output);
});

test('rejects runtime dependencies from API, model, and controller into outer feature layers', () => {
  const fixture = createProject({
    'src/features/orders/orders-api.ts':
      "import { loadOrders } from './orders-controller'; export const invalidApi = loadOrders;",
    'src/features/orders/admin/model/orders-model.ts':
      "import { requestOrders } from '../../api/orders-request'; export const invalidModel = requestOrders;",
    'src/features/orders/api/orders-request.ts': 'export const requestOrders = true;',
    'src/features/orders/orders-controller.ts':
      "import { OrdersPage } from './orders-page'; export const loadOrders = OrdersPage;",
    'src/features/orders/orders-page.tsx': 'export const OrdersPage = () => null;'
  });

  const result = cruise(fixture);

  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /no-feature-api-to-outer-feature-layers/);
  assert.match(result.output, /no-feature-model-to-non-model-feature-layers/);
  assert.match(result.output, /no-feature-controller-to-presentation/);
});

test('rejects type-only dependencies from API, model, and controller into outer feature layers', () => {
  const fixture = createProject({
    'src/features/orders/api/orders-api.ts':
      "import type { OrdersControllerState } from '../controller/orders-controller'; export type InvalidApi = OrdersControllerState;",
    'src/features/orders/model/orders-model.ts':
      "import type { OrdersRequest } from '../api/orders-request'; export type InvalidModel = OrdersRequest;",
    'src/features/orders/api/orders-request.ts': 'export type OrdersRequest = { page: number };',
    'src/features/orders/controller/orders-controller.ts':
      "import type { OrdersTableProps } from '../components/orders-table'; export type OrdersControllerState = OrdersTableProps;",
    'src/features/orders/components/orders-table.tsx':
      'export type OrdersTableProps = { rows: string[] }; export const OrdersTable = (_props: OrdersTableProps) => null;'
  });

  const result = cruise(fixture);

  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /no-feature-api-to-outer-feature-layers/);
  assert.match(result.output, /no-feature-model-to-non-model-feature-layers/);
  assert.match(result.output, /no-feature-controller-to-presentation/);
});

test('rejects component dependencies on controllers and pages, including type-only imports', () => {
  const fixture = createProject({
    'src/features/orders/controller/orders-controller.ts': 'export type OrdersState = { count: number };',
    'src/features/orders/pages/orders-page.tsx': 'export const OrdersPage = () => null;',
    'src/features/orders/components/orders-table.tsx':
      "import type { OrdersState } from '../controller/orders-controller'; export const OrdersTable = (_props: OrdersState) => null;",
    'src/features/orders/components/orders-summary.tsx':
      "import { OrdersPage } from '../pages/orders-page'; export const OrdersSummary = OrdersPage;",
    'src/features/orders/admin/controller/admin-orders-controller.ts':
      'export type AdminOrdersState = { count: number };',
    'src/features/orders/admin/components/admin-orders-table.tsx':
      "import type { AdminOrdersState } from '../controller/admin-orders-controller'; export const AdminOrdersTable = (_props: AdminOrdersState) => null;"
  });

  const result = cruise(fixture);

  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /no-feature-components-to-controller-or-pages/);
  assert.match(result.output, /orders-table[.]tsx/);
  assert.match(result.output, /orders-summary[.]tsx/);
  assert.match(result.output, /admin-orders-table[.]tsx/);
});

test('rejects runtime schema libraries from feature models while allowing API schemas', () => {
  const fixture = createProject({
    'src/features/orders/api/orders-schema.ts':
      "import { z } from 'zod'; export const orderWireSchema = z.object({ id: z.number() });",
    'src/features/orders/model/orders-model.ts':
      "import { z } from 'zod'; export const invalidDomainSchema = z.object({ id: z.number() });",
    'src/features/orders/model/orders-type-model.ts':
      "import type { ZodType } from 'zod'; export type InvalidDomainContract = ZodType<{ id: number }> ;",
    'src/features/orders/orders-model.ts':
      "import { z } from 'zod'; export const invalidRootDomainSchema = z.object({ id: z.number() });"
  });

  const result = cruise(fixture);

  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /no-feature-model-to-runtime-schema/);
  assert.match(result.output, /model\/orders-model[.]ts/);
  assert.match(result.output, /model\/orders-type-model[.]ts/);
  assert.match(result.output, /orders\/orders-model[.]ts/);
  assert.doesNotMatch(result.output, /orders-schema[.]ts.*no-feature-model-to-runtime-schema/);
});

test('rejects reverse layer dependencies and presentation transport access', () => {
  const fixture = createProject({
    'src/app/router.ts': 'export const router = true;',
    'src/shared/time/time.ts': 'export const now = 1;',
    'src/features/instrumentation/api/instrumentation-api.ts': 'export const load = true;',
    'src/features/instrumentation/controller/instrumentation-controller.ts':
      "import { router } from '@/app/router'; export const invalid = router;",
    'src/features/instrumentation/components/instrumentation-guide.tsx':
      "import { load } from '../api/instrumentation-api'; export const invalid = load;",
    'src/core/http/client.ts': "import { now } from '@/shared/time/time'; export const invalid = now;"
  });

  const result = cruise(fixture);

  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /no-feature-to-app-or-layout/);
  assert.match(result.output, /no-presentation-to-api/);
  assert.match(result.output, /no-core-to-outer-layers/);
});

test('rejects React runtime dependencies from every feature API', () => {
  const fixture = createProject({
    'src/features/orders/api/orders-api.ts': "import { useMemo } from 'react'; export const invalid = useMemo;",
    'src/features/status/public/api/status-api.ts':
      "import { useCallback } from 'react'; export const nestedInvalid = useCallback;"
  });

  const result = cruise(fixture);

  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /no-feature-api-to-react-runtime/);
});

test('rejects server-state and navigation runtimes from feature presentation', () => {
  const fixture = createProject({
    'src/features/orders/components/order-table.tsx':
      "import { useQuery } from '@tanstack/react-query'; export const OrderTable = useQuery;",
    'src/features/orders/pages/order-page.tsx':
      "import { useNavigate } from 'react-router-dom'; export const OrderPage = useNavigate;"
  });

  const result = cruise(fixture);

  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /no-feature-presentation-to-orchestration-runtime/);
});

test('rejects auth session runtimes from feature presentation while allowing controllers', () => {
  const coreSessionRuntime = {
    'src/core/auth/session-api.ts': 'export const loginSession = () => undefined;',
    'src/core/auth/session-context.tsx': 'export const useSession = () => undefined;',
    'src/core/auth/session-identity-context.tsx': 'export const useSessionIdentityBoundary = () => undefined;'
  };
  const allowedFixture = createProject({
    ...coreSessionRuntime,
    'src/features/auth/controller/use-login-controller.ts': [
      "import { loginSession } from '@/core/auth/session-api';",
      "import { useSession } from '@/core/auth/session-context';",
      "import { useSessionIdentityBoundary } from '@/core/auth/session-identity-context';",
      'export const useLoginController = () => [loginSession, useSession, useSessionIdentityBoundary];'
    ].join('\n')
  });
  const rejectedFixture = createProject({
    ...coreSessionRuntime,
    'src/features/auth/pages/login-page.tsx':
      "import { useSession } from '@/core/auth/session-context'; export const LoginPage = useSession;",
    'src/features/account/components/session-status.tsx': [
      "import { loginSession } from '@/core/auth/session-api';",
      "import { useSessionIdentityBoundary } from '@/core/auth/session-identity-context';",
      'export const SessionStatus = () => [loginSession, useSessionIdentityBoundary];'
    ].join('\n')
  });

  const allowedResult = cruise(allowedFixture);
  const rejectedResult = cruise(rejectedFixture);

  assert.equal(allowedResult.status, 0, allowedResult.output);
  assert.notEqual(rejectedResult.status, 0, rejectedResult.output);
  assert.match(rejectedResult.output, /no-feature-presentation-to-auth-session-runtime/);
  assert.match(rejectedResult.output, /login-page[.]tsx/);
  assert.match(rejectedResult.output, /session-status[.]tsx/);
});

test('rejects Refine resource and HTTP transport dependencies from feature presentation', () => {
  const fixture = createProject({
    'src/core/http.ts': 'export const request = true;',
    'src/features/orders/components/order-table.tsx':
      "import { useList } from '@refinedev/core'; export const OrderTable = useList;",
    'src/features/orders/pages/order-page.tsx':
      "import { request } from '@/core/http'; export const OrderPage = request;"
  });

  const result = cruise(fixture);

  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /no-feature-presentation-to-orchestration-runtime/);
  assert.match(result.output, /no-feature-presentation-to-http-transport/);
});

test('rejects orchestration runtimes from legacy feature-root pages', () => {
  const fixture = createProject({
    'src/features/orders/order-page.tsx':
      "import { useQuery } from '@tanstack/react-query'; export const OrderPage = useQuery;"
  });

  const result = cruise(fixture);

  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /no-feature-presentation-to-orchestration-runtime/);
});

test('rejects UI runtime dependencies from feature models', () => {
  const fixture = createProject({
    'src/features/orders/model/order.ts': "import { useMemo } from 'react'; export const invalidOrderModel = useMemo;"
  });

  const result = cruise(fixture);

  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /no-feature-model-to-ui-runtime/);
});

test('rejects UI runtimes from legacy feature-root models', () => {
  const fixture = createProject({
    'src/features/orders/order-model.ts': "import { useMemo } from 'react'; export const invalidOrderModel = useMemo;"
  });

  const result = cruise(fixture);

  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /no-feature-model-to-ui-runtime/);
});

test('rejects alternate production owners for the session provider and authentication gate', () => {
  const fixture = createProject({
    'src/core/auth/session-provider.tsx': 'export const SessionProvider = () => null;',
    'src/core/auth/auth-gate.tsx': 'export const AuthGate = () => null;',
    'src/app/refine/refine-runtime.tsx':
      "import { SessionProvider } from '@/core/auth/session-provider'; export const Runtime = SessionProvider;",
    'src/app/router.tsx': "import { AuthGate } from '@/core/auth/auth-gate'; export const router = AuthGate;",
    'src/layout/shell/alternate-auth-owner.tsx': [
      "import { SessionProvider } from '@/core/auth/session-provider';",
      "import { AuthGate } from '@/core/auth/auth-gate';",
      'export const AlternateAuthOwner = () => <><SessionProvider /><AuthGate /></>;'
    ].join('\n')
  });

  const result = cruise(fixture);

  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /session-provider-single-production-owner/);
  assert.match(result.output, /auth-gate-single-production-owner/);
});

test('rejects shell header dependencies on action side-effect owners', () => {
  const fixture = createProject({
    'src/core/auth/session-api.ts': 'export const logoutSession = () => undefined;',
    'src/core/runtime-preferences.ts': 'export const persistSystemPreferences = () => undefined;',
    'src/layout/shell/shell-header.tsx': [
      "import { logoutSession } from '@/core/auth/session-api';",
      "import { persistSystemPreferences } from '@/core/runtime-preferences';",
      'export const ShellHeader = () => { logoutSession(); persistSystemPreferences(); return null; };'
    ].join('\n')
  });

  const result = cruise(fixture);

  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /shell-header-composition-only/);
});

function createProject(files) {
  const directory = mkdtempSync(join(tmpdir(), 'hertzbeat-architecture-'));
  temporaryProjects.push(directory);
  writeFile(
    directory,
    'tsconfig.app.json',
    JSON.stringify({
      compilerOptions: {
        baseUrl: '.',
        jsx: 'react-jsx',
        paths: { '@/*': ['src/*'] }
      },
      include: ['src']
    })
  );
  Object.entries(files).forEach(([path, source]) => writeFile(directory, path, source));
  return directory;
}

function writeFile(root, path, content) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function cruise(cwd) {
  const result = spawnSync(dependencyCruiser, ['--config', configuration, '--output-type', 'err-long', 'src'], {
    cwd,
    encoding: 'utf8'
  });
  return {
    output: [result.stdout, result.stderr, result.error?.message].filter(Boolean).join('\n'),
    status: result.status
  };
}
