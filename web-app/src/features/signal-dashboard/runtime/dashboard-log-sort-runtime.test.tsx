/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { parseHertzBeatDashboardDocument, type HertzBeatLogRow } from '@/platform/perses';
import { PersesSignalRuntime } from '@/platform/perses/runtime/perses-signal-runtime';
import fixture from '@/platform/perses/model/fixtures/supported-dashboard.json';
import { DashboardPanelRuntime } from './dashboard-panel-runtime';
const request = vi.hoisted(() => vi.fn());
vi.mock('@/platform/perses', async importOriginal => ({
  ...(await importOriginal<typeof import('@/platform/perses')>()),
  queryHertzBeatData: request
}));
vi.mock('@/platform/perses/runtime/perses-signal-runtime', () => ({ PersesSignalRuntime: vi.fn(() => null) }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it('passes the persisted field order to both native rows and custom Dashboard cells', async () => {
  const raw = structuredClone(fixture);
  Object.assign(raw.spec.panels.logs.spec.plugin.spec, {
    columns: [{ kind: 'message' }, { kind: 'field', scope: 'attributes', path: ['proof.status'] }]
  });
  Object.assign(raw.spec.panels.logs.spec.queries[0]!.spec.plugin.spec.query, {
    logSort: { version: 1, field: 'attribute:proof.status', type: 'number', direction: 'desc' }
  });
  const document = parseHertzBeatDashboardDocument(raw);
  const rows = [
    { timeUnixNano: '1000000000', body: 'h', attributes: { 'proof.status': 599 } },
    { timeUnixNano: '3000000000', body: 'd', attributes: { 'proof.status': 501 } },
    { timeUnixNano: '2000000000', body: 'a', attributes: { 'proof.status': 500 } }
  ] as unknown as HertzBeatLogRow[];
  request.mockResolvedValue({ state: 'ready', data: { rows, total: 3 }, truncated: false });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <DashboardPanelRuntime
        panelId="logs"
        panel={document.spec.panels.logs!}
        variables={document.spec.variables}
        variableValues={{}}
        timeWindow={{ from: 1000, to: 3000 }}
        refreshRevision={0}
        enabled
        messages={{
          loading: 'Loading',
          inactive: 'Inactive',
          empty: 'Empty',
          truncated: 'Truncated',
          truncationUnknown: 'Unknown',
          runtimeError: 'Runtime error',
          failures: {
            'perses.query.invalid': 'Invalid',
            'perses.query.permission': 'Permission',
            'perses.query.overloaded': 'Overloaded',
            'perses.query.unavailable': 'Unavailable',
            'perses.query.contract': 'Contract'
          }
        }}
      />
    </QueryClientProvider>
  );
  await waitFor(() => expect(PersesSignalRuntime).toHaveBeenCalled());
  const props = vi.mocked(PersesSignalRuntime).mock.lastCall![0];
  if (props.kind !== 'logs-table') throw new Error('Expected log runtime');
  expect(props.data).toMatchObject({ preserveOrder: true });
  const column = props.display!.columns![1]!;
  expect(props.data.entries.map((entry, index) => [entry.line, column.getValue!(index)])).toEqual([
    ['h', '599'],
    ['d', '501'],
    ['a', '500']
  ]);
  expect(column.ariaSort).toBe('descending');
});
