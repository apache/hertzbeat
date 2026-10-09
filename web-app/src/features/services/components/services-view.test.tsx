/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { parseEntityRedSignal } from '../../entity/api/entity-signal-schema';
import { ServicesView } from './services-view';
import { ServiceRedTrends } from './service-red-trends';
import type { ServicesActions, ServicesViewModel } from '../model/services-model';
const metric = vi.hoisted(() => vi.fn());
vi.mock('@/platform/perses', () => ({
  HertzBeatMetricTimeSeriesResult: (props: { ariaLabel: string }) => {
    metric(props);
    return <div role="img" aria-label={props.ariaLabel} />;
  }
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
afterEach(() => {
  cleanup();
  metric.mockClear();
});
const idle = { kind: 'idle' } as const;
const state: ServicesViewModel = {
  query: { view: 'registered' },
  draft: { search: '', environment: '' },
  list: { kind: 'ready', data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 } },
  detail: idle,
  red: idle,
  operations: idle,
  freshness: idle,
  validWindow: true,
  timeLabel: '00:00–00:01 UTC',
  paths: { traces: '/explore?signal=traces', logs: '/explore?signal=logs', metrics: '/explore?signal=metrics' }
};
const actions: ServicesActions = {
  updateDraft: vi.fn(),
  query: vi.fn(),
  select: vi.fn(),
  directoryQuery: vi.fn(),
  directory: vi.fn(),
  page: vi.fn(),
  operation: vi.fn(),
  open: vi.fn(),
  refresh: vi.fn()
};
describe('services evidence states', () => {
  it('shows the directory alone until a service is selected', () => {
    render(<ServicesView state={state} actions={actions} />);
    expect(screen.getByRole('region', { name: 'services.directory' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'services.overview' })).not.toBeInTheDocument();
    expect(screen.queryByText('services.select')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'services.search' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'services.registered' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'services.performance' }));
    expect(actions.directoryQuery).toHaveBeenCalledWith({ view: 'performance', sort: undefined, order: undefined });
    expect(screen.getByRole('textbox', { name: 'services.environmentFilter' })).toBeInTheDocument();
  });

  it('shows selected evidence without the directory and exposes a return action', () => {
    const directory = vi.fn();
    render(
      <ServicesView
        state={{ ...state, query: { entityId: '7' }, detail: { kind: 'loading' } }}
        actions={{ ...actions, directory }}
      />
    );
    expect(screen.queryByRole('region', { name: 'services.directory' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'services.overview' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'services.search' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'services.environmentFilter' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'services.timeRange' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'services.query' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'services.backDirectory' }));
    expect(directory).toHaveBeenCalledOnce();
  });

  it('keeps canonical identity during refresh without displaying stale evidence', () => {
    const { rerender } = render(
      <ServicesView
        state={{
          ...state,
          query: { entityId: '7' },
          identity: {
            workspaceId: 'default',
            entityId: '7',
            entityType: 'service',
            serviceName: 'checkout',
            serviceNamespace: 'commerce',
            deploymentEnvironment: 'prod'
          },
          detail: { kind: 'loading' },
          red: { kind: 'loading' }
        }}
        actions={actions}
      />
    );
    expect(screen.getByRole('heading', { level: 2, name: 'checkout' })).toBeVisible();
    expect(screen.getByText('services.environment: prod')).toBeVisible();
    expect(screen.getByText('services.state.loading')).toBeVisible();
    expect(metric).not.toHaveBeenCalled();
    rerender(
      <ServicesView
        state={{
          ...state,
          query: { entityId: '8', serviceName: 'inventory', environment: 'staging' },
          detail: { kind: 'loading' }
        }}
        actions={actions}
      />
    );
    expect(screen.getByRole('heading', { level: 2, name: 'inventory' })).toBeVisible();
    expect(screen.getByText('services.environment: staging')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'checkout' })).not.toBeInTheDocument();
  });

  it('keeps disclosure identity during RED-only refresh without changing evidence state', () => {
    render(
      <ServicesView
        state={{
          ...state,
          query: { entityId: '7' },
          identity: {
            workspaceId: 'default',
            entityId: '7',
            entityType: 'service',
            serviceName: 'checkout',
            serviceNamespace: 'commerce',
            deploymentEnvironment: 'prod'
          },
          detail: {
            kind: 'ready',
            data: {
              entity: { id: 7, type: 'service', name: 'catalog-name', environment: 'catalog-env' },
              identities: [],
              monitorPreview: { items: [], total: 0, complete: true },
              relations: []
            }
          },
          red: { kind: 'loading' },
          freshness: { kind: 'loading' }
        }}
        actions={actions}
      />
    );
    const summary = screen.getByText('services.information', { selector: 'summary' });
    fireEvent.click(summary);
    const info = within(summary.closest('details')!);
    expect(info.getByText('checkout')).toBeVisible();
    expect(info.getByText('commerce')).toBeVisible();
    expect(info.getByText('prod')).toBeVisible();
    expect(info.getByText('services.state.loading')).toBeVisible();
    expect(metric).not.toHaveBeenCalled();
  });

  it('asks to repair the time window when a service is already selected', () => {
    render(
      <ServicesView
        state={{
          ...state,
          validWindow: false,
          query: { entityId: '7' },
          detail: {
            kind: 'ready',
            data: {
              entity: {
                id: 7,
                type: 'service',
                name: 'checkout',
                displayName: 'Checkout catalog alias',
                source: 'manual'
              },
              identities: [],
              monitorPreview: { items: [], total: 0, complete: true },
              relations: []
            }
          }
        }}
        actions={actions}
      />
    );
    expect(screen.queryAllByText('services.state.idle')).toHaveLength(0);
    expect(screen.getAllByText('services.invalidWindow').length).toBeGreaterThan(1);
  });

  it('renders valid Flow RED through the real Entity parser with approximate nullable percentiles', () => {
    const summary = {
      requestCount: 36,
      errorCount: 12,
      requestRatePerSecond: 0.6,
      errorRate: 1 / 3,
      latencyAverageMs: 86.326,
      latencyP95Ms: 184.025
    };
    const window = { from: 1750000000000, to: 1750000060000 };
    const red = parseEntityRedSignal(
      {
        state: 'ready',
        source: 'greptime_flow',
        resolutionSeconds: 60,
        window: { start: window.from, end: window.to },
        identity: {
          workspaceId: 'default',
          entityId: '7',
          entityType: 'service',
          serviceName: 'checkout',
          serviceNamespace: 'commerce',
          deploymentEnvironment: 'prod'
        },
        summary,
        series: [{ timestamp: window.from, ...summary }]
      },
      7,
      window
    );
    render(
      <ServicesView
        state={{
          ...state,
          query: { entityId: '7' },
          detail: {
            kind: 'ready',
            data: {
              entity: {
                id: 7,
                type: 'service',
                name: 'checkout',
                displayName: 'Checkout catalog alias',
                source: 'manual'
              },
              identities: [],
              monitorPreview: { items: [], total: 0, complete: true },
              relations: []
            }
          },
          paths: { ...state.paths, entity: '/entities/7' },
          red: { kind: 'ready', data: red }
        }}
        actions={actions}
      />
    );
    expect(screen.getByRole('heading', { level: 2, name: 'checkout' })).toBeInTheDocument();
    const disclosure = screen.getByText('services.information', { selector: 'summary' }).closest('details')!;
    expect(disclosure).not.toHaveAttribute('open');
    expect(screen.getByText('Checkout catalog alias')).not.toBeVisible();
    expect(screen.getByText('services.environment: prod')).toBeVisible();
    fireEvent.click(screen.getByText('services.information', { selector: 'summary' }));
    expect(disclosure).toHaveAttribute('open');
    expect(screen.getByText('Checkout catalog alias')).toBeVisible();
    expect(screen.getByText('manual')).toBeVisible();
    expect(screen.getByText('services.freshnessLimit')).toBeVisible();
    expect(screen.getByText('services.associationLimit')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'services.entity' }));
    expect(actions.open).toHaveBeenCalledWith('/entities/7');
    fireEvent.click(screen.getByRole('button', { name: 'services.openTraces' }));
    expect(actions.open).toHaveBeenCalledWith(state.paths.traces);
    expect(screen.getByText('36')).toBeInTheDocument();
    expect(screen.getByText('0.6')).toBeInTheDocument();
    expect(screen.getByText('33.33%')).toBeInTheDocument();
    expect(screen.getByText('184.03 ms')).toBeInTheDocument();
    expect(screen.getByText('services.redLimit')).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(3);
    expect(metric.mock.calls.every(([props]) => !props.timeSeriesCompact)).toBe(true);
    expect(metric.mock.calls.map(([props]) => props.outcome.data.series[0].points as unknown)).toEqual([
      [{ timestamp: window.from, value: 36 }],
      [{ timestamp: window.from, value: (1 / 3) * 100 }],
      [{ timestamp: window.from, value: 184.025 }]
    ]);
  });

  it('preserves observed bucket P95 values and leaves null percentiles absent', () => {
    const values = {
      requestCount: 10,
      errorCount: 1,
      requestRatePerSecond: 1 / 6,
      errorRate: 0.1,
      latencyAverageMs: 30,
      latencyP95Ms: null
    };
    render(
      <ServiceRedTrends
        red={{
          state: 'ready',
          source: 'greptime_flow',
          resolutionSeconds: 60,
          window: { start: 1750000000000, end: 1750000180000 },
          identity: {
            workspaceId: 'default',
            entityId: '7',
            entityType: 'service',
            serviceName: 'checkout',
            serviceNamespace: null,
            deploymentEnvironment: null
          },
          summary: values,
          series: [
            { ...values, timestamp: 1750000000000, latencyP95Ms: 100 },
            { ...values, timestamp: 1750000060000 },
            { ...values, timestamp: 1750000120000, latencyP95Ms: 900 }
          ]
        }}
      />
    );
    const percentile = metric.mock.calls.at(-1)![0];
    expect(percentile.outcome.data.series[0]).toMatchObject({
      unit: 'ms',
      points: [
        { timestamp: 1750000000000, value: 100 },
        { timestamp: 1750000120000, value: 900 }
      ]
    });
    expect(percentile.timeSeriesDisplay).toBe('bar');
    expect(percentile.query.timeWindow).toEqual({ from: 1750000000000, to: 1750000180000 });
    cleanup();
    metric.mockClear();
    render(
      <ServiceRedTrends
        red={{
          state: 'ready',
          source: 'greptime_flow',
          resolutionSeconds: 60,
          window: { start: 1750000000000, end: 1750000060000 },
          identity: {
            workspaceId: 'default',
            entityId: '7',
            entityType: 'service',
            serviceName: 'checkout',
            serviceNamespace: null,
            deploymentEnvironment: null
          },
          summary: values,
          series: [{ ...values, timestamp: 1750000000000 }]
        }}
      />
    );
    expect(metric).toHaveBeenCalledTimes(2);
    expect(screen.getByText('services.unknown')).toBeInTheDocument();
    expect(metric.mock.calls[0]![0].timeSeriesDisplay).toBe('bar');
  });

  it('labels generic directory evidence and preserves unavailable evidence as unknown', () => {
    render(
      <ServicesView
        state={{
          ...state,
          list: {
            kind: 'ready',
            data: {
              content: [
                {
                  id: 7,
                  type: 'service',
                  name: 'checkout',
                  source: 'opentelemetry',
                  lastEvidenceAt: 1750000000000,
                  identityCount: 1,
                  monitorCount: 0,
                  relationCount: 0,
                  activeAlertCount: 0
                },
                {
                  id: 8,
                  type: 'service',
                  name: 'inventory',
                  identityCount: 0,
                  monitorCount: 0,
                  relationCount: 0,
                  activeAlertCount: 0
                }
              ],
              totalElements: 2,
              totalPages: 1,
              number: 0,
              size: 10
            }
          }
        }}
        actions={actions}
      />
    );
    expect(screen.getByRole('columnheader', { name: 'services.lastEntityEvidence' })).toBeInTheDocument();
    expect(screen.getByText('opentelemetry')).toBeInTheDocument();
    expect(document.querySelector('time')).toHaveAttribute('dateTime', '2025-06-15T15:06:40.000Z');
    expect(screen.queryByRole('columnheader', { name: 'services.latestTrace' })).toBeNull();
  });

  it('keeps raw signals reachable for an empty service catalog', () => {
    render(<ServicesView state={state} actions={actions} />);
    expect(screen.getByText('services.empty')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'services.openTraces' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'services.openLogs' })).toBeInTheDocument();
  });
  it('shows a failed RED read independently of an available operation', () => {
    render(
      <ServicesView
        state={{
          ...state,
          query: { entityId: '7' },
          detail: {
            kind: 'ready',
            data: {
              entity: { id: 7, type: 'service', name: 'checkout' },
              identities: [],
              monitorPreview: { items: [], total: 0, complete: true },
              relations: []
            }
          },
          red: { kind: 'unavailable' },
          operations: {
            kind: 'ready',
            data: [{ value: 'checkout', traceCount: 3, errorTraceCount: 1, latencyAvgMs: null, latencyP95Ms: null }]
          }
        }}
        actions={actions}
      />
    );
    expect(screen.getByText('services.state.unavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'checkout' }));
    expect(actions.operation).toHaveBeenCalledWith('checkout', false);
    fireEvent.click(screen.getByRole('button', { name: 'services.errorAction' }));
    expect(actions.operation).toHaveBeenCalledWith('checkout', true);
    expect(screen.getByText('services.operationLimit')).toBeInTheDocument();
    expect(screen.getAllByText('services.unknown').length).toBeGreaterThan(0);
    expect(screen.queryByText('0 ms')).not.toBeInTheDocument();
    expect(metric).not.toHaveBeenCalled();
  });
});
