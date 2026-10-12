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

import { StrictMode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  parseHertzBeatDashboardDocument,
  type HertzBeatMetricQueryOutcome,
  type HertzBeatQuery
} from '@/platform/perses';
import fixture from '@/platform/perses/model/fixtures/supported-dashboard.json';
import { DashboardPanelRuntime } from './dashboard-panel-runtime';

const request = vi.hoisted(() =>
  vi.fn<(query: HertzBeatQuery, options?: { signal?: AbortSignal }) => Promise<HertzBeatMetricQueryOutcome>>()
);
const runtime = vi.hoisted(() => ({ fail: false }));
vi.mock('@/platform/perses', async importOriginal => ({
  ...(await importOriginal<typeof import('@/platform/perses')>()),
  queryHertzBeatData: request
}));
// Exercise the actual primitive and its ErrorBoundary, replacing only the lazy visualization implementation.
vi.mock('@/platform/perses/runtime/perses-signal-runtime', () => ({
  PersesSignalRuntime: () => {
    if (runtime.fail) throw new Error('Injected visualization failure');
    return <div>Metric visualization ready</div>;
  }
}));
const document = parseHertzBeatDashboardDocument(fixture);
const props = {
  panelId: 'jvm',
  panel: document.spec.panels.jvm!,
  variables: document.spec.variables,
  variableValues: {},
  timeWindow: { from: 1_780_000_000_000, to: 1_780_000_060_000 },
  refreshRevision: 0,
  enabled: true,
  messages: {
    loading: 'Loading',
    inactive: 'Query to load',
    empty: 'No data',
    truncated: 'Truncated',
    truncationUnknown: 'Unknown coverage',
    runtimeError: 'Render failed',
    failures: {
      'perses.query.invalid': 'Invalid',
      'perses.query.permission': 'Forbidden',
      'perses.query.overloaded': 'Capacity',
      'perses.query.unavailable': 'Unavailable',
      'perses.query.contract': 'Contract'
    }
  }
};
const ready: HertzBeatMetricQueryOutcome = {
  state: 'ready',
  truncated: 'unknown',
  data: {
    timeWindow: props.timeWindow,
    source: 'test-fixture',
    series: [
      {
        key: 'jvm',
        name: 'jvm_memory_used_bytes',
        labels: {},
        points: [{ timestamp: props.timeWindow.from, value: 1 }]
      }
    ]
  }
};
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  runtime.fail = false;
});

describe('Dashboard panel recovery at the actual Perses error boundary', () => {
  it('recovers a rendering failure after refresh with unchanged query conditions', async () => {
    runtime.fail = true;
    request.mockResolvedValue(ready);
    const client = new QueryClient();
    const wrap = (refreshRevision: number) => (
      <QueryClientProvider client={client}>
        <DashboardPanelRuntime {...props} refreshRevision={refreshRevision} />
      </QueryClientProvider>
    );
    const view = render(wrap(0));
    expect(await screen.findByText('Render failed')).toBeInTheDocument();
    runtime.fail = false;
    view.rerender(wrap(1));
    expect(await screen.findByText('Metric visualization ready')).toBeInTheDocument();
    expect(screen.queryByText('Render failed')).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0]![0]).toEqual(request.mock.calls[1]![0]);
  });

  it('recovers a rendering failure after panel cancel and retry without changing revision', async () => {
    runtime.fail = true;
    request.mockResolvedValue(ready);
    const client = new QueryClient();
    const wrap = (enabled: boolean) => (
      <QueryClientProvider client={client}>
        <DashboardPanelRuntime {...props} enabled={enabled} />
      </QueryClientProvider>
    );
    const view = render(wrap(true));
    expect(await screen.findByText('Render failed')).toBeInTheDocument();
    view.rerender(wrap(false));
    expect(screen.getByText('Query to load')).toBeInTheDocument();
    runtime.fail = false;
    view.rerender(wrap(true));
    expect(await screen.findByText('Metric visualization ready')).toBeInTheDocument();
    expect(screen.queryByText('Render failed')).not.toBeInTheDocument();
  });

  it('restarts a StrictMode-retired request and reaches ready instead of permanent loading', async () => {
    request.mockImplementationOnce(() => new Promise(() => {})).mockResolvedValue(ready);
    const client = new QueryClient();
    render(
      <StrictMode>
        <QueryClientProvider client={client}>
          <DashboardPanelRuntime {...props} />
        </QueryClientProvider>
      </StrictMode>
    );
    expect(await screen.findByText('Metric visualization ready')).toBeInTheDocument();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[0]![1]!.signal!.aborted).toBe(true);
    expect(request.mock.calls[1]![1]!.signal!.aborted).toBe(false);
    expect(screen.queryByText('Loading')).not.toBeInTheDocument();
  });
});
