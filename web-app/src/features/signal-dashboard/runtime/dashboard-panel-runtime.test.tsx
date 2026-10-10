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
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HertzBeatLogAnalysisQuery, HertzBeatQueryOutcome, LogAnalysisEvidence } from '@/platform/perses';
import { parseHertzBeatDashboardDocument, queryHertzBeatData } from '@/platform/perses';
import fixture from '@/platform/perses/model/fixtures/supported-dashboard.json';
import { DashboardPanelRuntime } from './dashboard-panel-runtime';
import { buildCalculatedPageRequest, loadCalculatedPage } from '@/features/explore/api/explore-log-calculated-v2-api';
import { buildExploreDashboardHandoff } from '@/features/explore/model/explore-dashboard-handoff';
import { ApiMessageError } from '@/core/http/api-message';

vi.mock('@/platform/perses', async importOriginal => ({
  ...(await importOriginal<typeof import('@/platform/perses')>()),
  queryHertzBeatData: vi.fn()
}));
vi.mock('@/features/explore/api/explore-log-calculated-v2-api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/explore/api/explore-log-calculated-v2-api')>()),
  loadCalculatedPage: vi.fn()
}));
const request = vi.mocked(queryHertzBeatData);
const calculatedRequest = vi.mocked(loadCalculatedPage);
const document = parseHertzBeatDashboardDocument(fixture);
const messages = {
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
};
const props = {
  panelId: 'logs',
  panel: document.spec.panels.logs!,
  variables: document.spec.variables,
  variableValues: {},
  timeWindow: { from: 1_780_000_000_000, to: 1_780_000_060_000 },
  refreshRevision: 0,
  enabled: true,
  messages
};
function host(children: React.ReactNode) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
      {children}
    </QueryClientProvider>
  );
}
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('independent Dashboard panel runtime', () => {
  it('reopens a calculated panel through the verified POST path with exact scope', async () => {
    const logCalculatedV2 = JSON.stringify({
      version: 2,
      nextFieldSeq: 2,
      fields: [{ id: 'c1', kind: 'formula', name: 'upperService', expression: 'upper(@service)' }]
    });
    const handoff = buildExploreDashboardHandoff(
      {
        signal: 'logs',
        timeRange: 'last-30m',
        entityId: '17',
        serviceName: 'checkout',
        serviceNamespace: 'shop',
        environment: 'staging',
        searchSyntax: 'structured-v2',
        logCalculatedV2
      },
      { timeWindow: props.timeWindow, timeZone: 'UTC', title: 'Calculated logs', dashboardKey: 'calculated-logs' }
    );
    if (handoff.state !== 'ready') throw new Error('Expected supported handoff');
    const panel = parseHertzBeatDashboardDocument(JSON.parse(JSON.stringify(handoff.handoff.document))).spec.panels
      .explore!;
    calculatedRequest.mockResolvedValue({
      version: 2,
      window: { start: props.timeWindow.from, end: props.timeWindow.to },
      executed: {
        parameters: {},
        calculatedFields: {
          version: 2,
          fields: [
            {
              id: 'c1',
              kind: 'formula',
              name: 'upperService',
              expression: 'upper(@service)',
              outputs: [{ name: 'upperService', type: 'string' }]
            }
          ]
        },
        operation: { kind: 'page', pageIndex: 0, pageSize: 20, sort: { field: 'timestamp', direction: 'desc' } }
      },
      result: { kind: 'page', totalElements: 0, rows: [] }
    });
    const view = render(
      host(<DashboardPanelRuntime {...props} panel={panel} variables={[]} timeZone="Asia/Shanghai" />)
    );
    expect(await screen.findByText('No data')).toBeInTheDocument();
    expect(calculatedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        logCalculatedV2,
        start: props.timeWindow.from,
        end: props.timeWindow.to,
        timeZone: 'Asia/Shanghai',
        entityId: '17',
        serviceName: 'checkout',
        serviceNamespace: 'shop',
        environment: 'staging'
      }),
      expect.any(AbortSignal)
    );
    expect(request).not.toHaveBeenCalled();
    const posted = buildCalculatedPageRequest(calculatedRequest.mock.calls[0]![0]);
    expect(posted.parameters).toMatchObject({
      start: String(props.timeWindow.from),
      end: String(props.timeWindow.to),
      entityId: '17',
      serviceName: 'checkout'
    });
    expect(posted.calculatedFields.fields[0]).toMatchObject({ name: 'upperService', expression: 'upper(@service)' });
    calculatedRequest.mockRejectedValueOnce(
      new ApiMessageError('observability_log_filter_invalid', {
        status: 400,
        data: { reason: 'calculated_budget_exceeded' }
      })
    );
    view.rerender(
      host(
        <DashboardPanelRuntime {...props} panel={panel} variables={[]} timeZone="Asia/Shanghai" refreshRevision={1} />
      )
    );
    expect(await screen.findByText('Capacity')).toBeInTheDocument();
    expect(screen.queryByText('No data')).not.toBeInTheDocument();
  });
  it('isolates one failed panel from a successful empty panel', async () => {
    request.mockResolvedValueOnce({ state: 'empty', truncated: false }).mockResolvedValueOnce({
      state: 'error',
      error: { kind: 'permission', messageKey: 'perses.query.permission', retryable: false }
    });
    render(
      host(
        <>
          <DashboardPanelRuntime {...props} />
          <DashboardPanelRuntime {...props} panelId="second" />
        </>
      )
    );
    expect(await screen.findByText('No data')).toBeInTheDocument();
    expect(await screen.findByText('Forbidden')).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('does not fetch disabled or invalid panels', () => {
    render(
      host(
        <>
          <DashboardPanelRuntime {...props} enabled={false} />
          <DashboardPanelRuntime {...props} panelId="invalid" variableValues={{ environment: 'not-an-option' }} />
        </>
      )
    );
    expect(screen.getByText('Query to load')).toBeInTheDocument();
    expect(screen.getByText('Invalid')).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });
  it('aborts the retired query and prevents a late result from replacing the new scope', async () => {
    let finishOld!: (value: {
      state: 'error';
      error: { kind: 'permission'; messageKey: 'perses.query.permission'; retryable: false };
    }) => void;
    request
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finishOld = resolve;
          })
      )
      .mockResolvedValueOnce({ state: 'empty', truncated: false });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const wrap = (serviceName: string, enabled = true) => (
      <QueryClientProvider client={client}>
        <DashboardPanelRuntime {...props} variableValues={{ serviceName }} enabled={enabled} />
      </QueryClientProvider>
    );
    const view = render(wrap('old-service'));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    const oldSignal = request.mock.calls[0]![1]!.signal!;
    view.rerender(wrap('new-service'));
    expect(await screen.findByText('No data')).toBeInTheDocument();
    expect(oldSignal.aborted).toBe(true);
    await act(async () => {
      finishOld({
        state: 'error',
        error: { kind: 'permission', messageKey: 'perses.query.permission', retryable: false }
      });
      await Promise.resolve();
    });
    expect(screen.queryByText('Forbidden')).not.toBeInTheDocument();
    expect(request.mock.calls[1]![0].context?.serviceName).toBe('new-service');
  });
  it('refreshes only the targeted panel and aborts pending work on unmount', async () => {
    request.mockResolvedValue({ state: 'empty', truncated: false });
    const client = new QueryClient();
    const wrap = (refreshRevision: number) => (
      <QueryClientProvider client={client}>
        <DashboardPanelRuntime {...props} refreshRevision={refreshRevision} />
        <DashboardPanelRuntime {...props} panelId="other" />
      </QueryClientProvider>
    );
    const view = render(wrap(0));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    request.mockImplementationOnce(() => new Promise(() => {}));
    view.rerender(wrap(1));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(3));
    const signal = request.mock.calls[2]![1]!.signal!;
    view.unmount();
    expect(signal.aborted).toBe(true);
  });

  it.each(['jvm', 'logs', 'traces', 'trace'])(
    'executes the resolved %s query through the controlled client',
    async id => {
      request.mockResolvedValue({ state: 'empty', truncated: false });
      render(host(<DashboardPanelRuntime {...props} panelId={id} panel={document.spec.panels[id]!} />));
      expect(await screen.findByText('No data')).toBeInTheDocument();
      expect(request).toHaveBeenCalledTimes(1);
      const [query, options] = request.mock.calls[0]!;
      expect(query.timeWindow).toEqual(props.timeWindow);
      expect(options?.signal).toBeInstanceOf(AbortSignal);
      if (id === 'trace')
        expect(query).toMatchObject({
          signal: 'traces',
          queryKind: 'gantt',
          traceId: '0123456789abcdef0123456789abcdef'
        });
      else expect(query.context?.serviceName).toBe('alpha-java-m2');
    }
  );

  it('shows a fresh loading state while retrying a settled failure', async () => {
    request
      .mockResolvedValueOnce({
        state: 'error',
        error: { kind: 'permission', messageKey: 'perses.query.permission', retryable: false }
      })
      .mockImplementationOnce(() => new Promise(() => {}));
    const client = new QueryClient();
    const wrap = (enabled: boolean) => (
      <QueryClientProvider client={client}>
        <DashboardPanelRuntime {...props} enabled={enabled} />
      </QueryClientProvider>
    );
    const view = render(wrap(true));
    expect(await screen.findByText('Forbidden')).toBeInTheDocument();
    view.rerender(wrap(false));
    view.rerender(wrap(true));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.queryByText('Forbidden')).not.toBeInTheDocument();
  });

  it('aborts a pending request on disable and can query again after enabling', async () => {
    request
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValueOnce({ state: 'empty', truncated: false });
    const client = new QueryClient();
    const wrap = (enabled: boolean) => (
      <QueryClientProvider client={client}>
        <DashboardPanelRuntime {...props} enabled={enabled} />
      </QueryClientProvider>
    );
    const view = render(wrap(true));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    const signal = request.mock.calls[0]![1]!.signal!;
    view.rerender(wrap(false));
    await waitFor(() => expect(signal.aborted).toBe(true));
    expect(screen.getByText('Query to load')).toBeInTheDocument();
    view.rerender(wrap(true));
    expect(await screen.findByText('No data')).toBeInTheDocument();
  });
});
it('offers Cancel while fetching and Refresh after completion without a stale Retry action', async () => {
  let resolve!: (value: { state: 'empty'; truncated: false }) => void;
  request.mockImplementationOnce(
    () =>
      new Promise(done => {
        resolve = done;
      })
  );
  render(host(<DashboardPanelRuntime {...props} actions={{ retry: vi.fn(), cancel: vi.fn(), cancelled: false }} />));
  expect(await screen.findByRole('button', { name: 'common.cancel' })).toBeInTheDocument();
  act(() => resolve({ state: 'empty', truncated: false }));
  expect(await screen.findByRole('button', { name: 'common.refresh' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'common.cancel' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'signalDashboard.retryPanel' })).toBeNull();
});

it('renders analytical group evidence through the real Dashboard runtime instead of raw log rows', async () => {
  const panel = structuredClone(props.panel);
  Object.assign(panel.spec.queries[0].spec.plugin.spec, {
    query: {
      signal: 'logs',
      queryKind: 'analysis',
      analysis: { version: 1, representation: 'table', limit: 20, order: 'count-desc', minCount: 1 }
    }
  });
  vi.mocked<(query: HertzBeatLogAnalysisQuery) => Promise<HertzBeatQueryOutcome<LogAnalysisEvidence>>>(
    queryHertzBeatData
  ).mockResolvedValueOnce({
    state: 'ready',
    truncated: false,
    data: {
      kind: 'single',
      data: {
        window: { start: props.timeWindow.from, end: props.timeWindow.to },
        field: { id: 'builtin:serviceName', source: 'builtin', key: 'serviceName' },
        view: 'groups',
        limit: 20,
        order: 'count-desc',
        minCount: 1,
        matchingTotal: 7,
        truncated: false,
        intervalMs: null,
        groups: [{ kind: 'value', value: 'operational-group', count: 7, buckets: [] }]
      }
    }
  });
  render(host(<DashboardPanelRuntime {...props} panel={panel} />));
  expect(await screen.findByText('operational-group')).toBeVisible();
  expect(screen.getByText('7')).toBeVisible();
  expect(request).toHaveBeenCalledOnce();
});
