/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
