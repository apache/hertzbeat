/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import enUS from '@/assets/i18n/en-us.json';
import jaJP from '@/assets/i18n/ja-jp.json';
import ptBR from '@/assets/i18n/pt-br.json';
import zhCN from '@/assets/i18n/zh-cn.json';
import zhTW from '@/assets/i18n/zh-tw.json';

import type { EntitySignalViewState } from '../model/entity-signal-view-model';
import { EntitySignalView } from './entity-signal-view';

vi.mock('@/platform/perses', async importOriginal => ({
  ...(await importOriginal<typeof import('@/platform/perses')>()),
  HertzBeatMetricTimeSeriesResult: ({ ariaLabel }: { ariaLabel: string }) => <div data-testid={ariaLabel} />,
  HertzBeatLogsTableResult: ({ ariaLabel }: { ariaLabel: string }) => <div data-testid={ariaLabel} />,
  HertzBeatTraceTableResult: ({ ariaLabel }: { ariaLabel: string }) => <div data-testid={ariaLabel} />,
  HertzBeatTracingGanttChartResult: ({ ariaLabel }: { ariaLabel: string }) => <div data-testid={ariaLabel} />
}));

describe('EntitySignalView', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it.each([enUS, jaJP, ptBR, zhCN, zhTW])('has no obsolete host-sidecar label in runtime locales', locale => {
    expect(locale.entity.signals.query).not.toHaveProperty('investigationActions');
  });

  it('keeps each available signal in its own section and explains correlations in the evidence rail', () => {
    renderView(readyState());

    expect(screen.getByRole('heading', { name: 'Metrics' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Logs' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Topology' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bound monitors' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Traces' })).not.toBeInTheDocument();
    expect(screen.getByText('No traces in this window')).toBeInTheDocument();

    const evidence = screen.getByRole('complementary', { name: 'Evidence' });
    expect(within(evidence).getByText('Same entity')).toBeInTheDocument();
    expect(within(evidence).getByText('High confidence')).toBeInTheDocument();
    expect(within(evidence).getByText('Greptime Flow · 60s')).toBeInTheDocument();
    expect(screen.getByTestId('Request rate visualization')).toBeInTheDocument();
    expect(screen.getByTestId('Log evidence visualization')).toBeInTheDocument();
  });

  it('uses compact, distinct empty and unavailable states without fake zeros or empty Perses canvases', () => {
    const state = readyState();
    state.capabilities = { ...state.capabilities, metrics: 'unknown', redMetrics: 'empty', logs: 'unavailable' };
    state.red = { state: 'empty' };
    state.logs = { state: 'error', error: unavailableFailure() };
    state.evidence = [];
    renderView(state);

    const metrics = screen.getByRole('group', { name: 'Metrics' });
    expect(within(metrics).getByText('Unknown')).toBeInTheDocument();
    expect(
      within(metrics).getByText('No RED metrics in this window; other metric sources are unknown')
    ).toBeInTheDocument();
    expect(within(metrics).queryByText('Empty')).not.toBeInTheDocument();
    expect(screen.getByText('Logs are unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/^0(?:\.0+)?$/u)).not.toBeInTheDocument();
    expect(screen.queryByTestId('Request rate visualization')).not.toBeInTheDocument();
    expect(screen.queryByTestId('Log evidence visualization')).not.toBeInTheDocument();
  });
});

function renderView(state: EntitySignalViewState) {
  render(
    <I18nextProvider i18n={i18n}>
      <EntitySignalView state={state} openSignal={vi.fn()} openTopology={vi.fn()} />
    </I18nextProvider>
  );
}

function readyState(): Extract<EntitySignalViewState, { kind: 'ready' }> {
  const metricOutcome = {
    state: 'ready' as const,
    truncated: false as const,
    data: {
      timeWindow: { from: 1_750_000_000_000, to: 1_750_000_060_000 },
      source: 'greptime_flow',
      series: [
        { key: 'rate-7', name: 'request_rate', labels: {}, points: [{ timestamp: 1_750_000_000_000, value: 2 }] }
      ]
    }
  };
  return {
    kind: 'ready',
    plan: {
      anchor: {
        source: 'entity',
        context: { entityId: '7' },
        window: { from: 1_750_000_000_000, to: 1_750_000_060_000, timeZone: 'UTC' }
      },
      logsQuery: {
        signal: 'logs',
        queryKind: 'table',
        timeWindow: { from: 1_750_000_000_000, to: 1_750_000_060_000 },
        context: { entityId: '7', entityType: 'service' },
        limit: 25
      },
      tracesQuery: {
        signal: 'traces',
        queryKind: 'table',
        timeWindow: { from: 1_750_000_000_000, to: 1_750_000_060_000 },
        context: { entityId: '7', entityType: 'service' },
        limit: 25
      }
    },
    capabilities: {
      metrics: 'available',
      logs: 'available',
      traces: 'empty',
      topology: 'available',
      collection: 'unknown',
      alerts: 'unknown',
      nativeMetrics: 'unknown',
      otelMetrics: 'unknown',
      redMetrics: 'available',
      traceCorrelation: 'empty',
      logTraceCorrelation: 'unknown',
      semanticGraph: 'available'
    },
    red: {
      state: 'ready',
      source: 'greptime_flow',
      resolutionSeconds: 60,
      window: { start: 1_750_000_000_000, end: 1_750_000_060_000 },
      identity: {
        workspaceId: 'default',
        entityId: '7',
        entityType: 'service',
        serviceName: 'checkout',
        serviceNamespace: null,
        deploymentEnvironment: null
      },
      summary: {
        requestCount: 120,
        errorCount: 3,
        requestRatePerSecond: 2,
        errorRate: 0.025,
        latencyAverageMs: 84,
        latencyP95Ms: 170
      },
      series: [
        {
          timestamp: 1_750_000_000_000,
          requestCount: 120,
          errorCount: 3,
          requestRatePerSecond: 2,
          errorRate: 0.025,
          latencyAverageMs: 84,
          latencyP95Ms: 170
        }
      ]
    },
    redMetrics: { requestRate: metricOutcome, errorRate: metricOutcome, latencyP95: metricOutcome },
    logs: {
      state: 'ready',
      truncated: false,
      data: { rows: [{}] as never[], total: 1 }
    },
    traces: { state: 'empty', truncated: false },
    evidence: [
      {
        key: 'metrics',
        summary: { state: 'available' },
        candidateQuery: {
          key: 'metrics',
          anchor: {
            source: 'metric',
            context: { entityId: '7' },
            window: { from: 1_750_000_000_000, to: 1_750_000_060_000, timeZone: 'UTC' }
          }
        },
        reason: { kind: 'same-entity', level: 2 },
        confidence: 'high'
      }
    ],
    boundMonitors: { state: 'known', total: 1, names: ['checkout-http'] },
    topology: { total: 1, names: ['payments'] },
    alerts: { currentActiveCount: 2 }
  };
}

function unavailableFailure() {
  return { kind: 'unavailable', messageKey: 'perses.query.unavailable', retryable: true } as const;
}
