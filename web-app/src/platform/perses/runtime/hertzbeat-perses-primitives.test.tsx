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

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { HertzBeatQueryOutcome } from '../datasource/hertzbeat-query-contract';
import { HertzBeatPrimitiveFrame } from './hertzbeat-perses-primitive-frame';
import persesPrimitiveStyles from './hertzbeat-perses-primitives.module.css?raw';

const runtimeControl = vi.hoisted<{ fail: boolean; rowSelection: unknown }>(() => ({
  fail: false,
  rowSelection: undefined
}));
vi.mock('./perses-signal-runtime', () => ({
  PersesSignalRuntime: ({
    kind,
    onTimeWindowChange,
    timeWindowChangeEnabled,
    rowSelection
  }: {
    kind: string;
    onTimeWindowChange?: ((window: { from: number; to: number }) => void) | undefined;
    timeWindowChangeEnabled?: boolean | undefined;
    rowSelection?: unknown;
  }) => {
    runtimeControl.rowSelection = rowSelection;
    if (runtimeControl.fail) throw new Error('private runtime detail');
    if (kind === 'logs-table' || kind === 'trace-table') {
      return (
        <section className="MuiCard-root">
          <div className="MuiCardContent-root">
            <div
              className="MuiBox-root"
              data-testid="official-panel-inner-surface"
              style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }}
            >
              <table aria-label={`official ${kind}`} data-testid={`official-${kind}`} />
            </div>
          </div>
        </section>
      );
    }
    if (kind === 'tracing-gantt-chart') {
      return <button data-testid={`official-${kind}`}>Inspect span</button>;
    }
    return (
      <button
        type="button"
        data-testid={`official-${kind}`}
        disabled={timeWindowChangeEnabled === false}
        onClick={() => onTimeWindowChange?.({ from: timeWindow.from + 1_000, to: timeWindow.to - 1_000 })}
      >
        Zoom time series
      </button>
    );
  }
}));

import {
  HertzBeatLogsTableResult,
  HertzBeatTracingGanttChartResult,
  HertzBeatTraceTableResult,
  HertzBeatMetricTimeSeriesResult,
  type HertzBeatPersesPrimitiveMessages
} from './hertzbeat-perses-primitives';

const timeWindow = { from: 1_750_000_000_000, to: 1_750_000_060_000 } as const;
const messages: HertzBeatPersesPrimitiveMessages = {
  loading: 'Loading signal',
  empty: 'No signal data',
  truncated: 'Results are truncated',
  truncationUnknown: 'Result completeness is unknown',
  runtimeError: 'Visualization unavailable',
  failures: {
    'perses.query.invalid': 'Invalid query',
    'perses.query.permission': 'Permission denied',
    'perses.query.overloaded': 'Query capacity unavailable',
    'perses.query.unavailable': 'Storage unavailable',
    'perses.query.contract': 'Unexpected response'
  }
};

describe('HertzBeat Perses primitives', () => {
  beforeEach(() => {
    runtimeControl.fail = false;
    runtimeControl.rowSelection = undefined;
  });
  afterEach(cleanup);

  it.each([true, false, 'unknown'] as const)(
    'shows bounded empty completeness %s without inventing data',
    truncated => {
      render(
        <HertzBeatTraceTableResult
          title="Traces"
          ariaLabel="Trace results"
          messages={{ ...messages, bounded: limit => `Bounded to ${limit} candidate rows` }}
          query={{ signal: 'traces', queryKind: 'table', timeWindow }}
          outcome={{
            state: 'empty',
            truncated,
            query: {
              sort: 'newest',
              coverage: 'bounded',
              rowLimit: 1500,
              truncated: truncated === 'unknown' ? null : truncated
            }
          }}
        />
      );
      expect(screen.getByText(messages.empty as string)).toBeInTheDocument();
      expect(screen.getByRole('status', { name: 'Trace results completeness' })).toHaveTextContent(
        truncated === true
          ? 'Results are truncated'
          : truncated === false
            ? 'Bounded to 1500 candidate rows'
            : 'Result completeness is unknown'
      );
      expect(screen.queryByTestId('official-trace-table')).not.toBeInTheDocument();
    }
  );

  it('preserves loading, empty and permission states at the renderer boundary', () => {
    const common = {
      title: 'Logs',
      ariaLabel: 'Logs table',
      messages,
      toRuntimeProps: () => {
        throw new Error('No ready data should be rendered');
      }
    };
    const view = render(<HertzBeatPrimitiveFrame {...common} state={{ kind: 'loading', queryKey: 'scope' }} />);
    expect(screen.getByRole('status', { name: 'Logs table' })).toHaveTextContent('Loading signal');
    view.rerender(
      <HertzBeatPrimitiveFrame
        {...common}
        state={{ kind: 'resolved', queryKey: 'scope', outcome: { state: 'empty', truncated: false } }}
      />
    );
    expect(screen.getByRole('status', { name: 'Logs table' })).toHaveTextContent('No signal data');
    view.rerender(
      <HertzBeatPrimitiveFrame
        {...common}
        state={{
          kind: 'resolved',
          queryKey: 'scope',
          outcome: {
            state: 'error',
            error: { kind: 'permission', messageKey: 'perses.query.permission', retryable: false }
          }
        }}
      />
    );
    expect(screen.getByRole('alert', { name: 'Logs table' })).toHaveTextContent('Permission denied');
    expect(screen.queryByTestId('official-logs-table')).not.toBeInTheDocument();
  });

  it('forces the official log row onto stable time, severity and message tracks', () => {
    expect(persesPrimitiveStyles).toMatch(
      /data-log-show-time='true'[\s\S]*grid-template-columns:\s*184px 72px minmax\(0, 1fr\)\s*!important/s
    );
    expect(persesPrimitiveStyles).toMatch(
      /data-log-density[\s\S]*data-log-index[\s\S]*div:last-of-type[\s\S]*margin-left:\s*0\s*!important/s
    );
  });

  it('keeps row-internal actions below the compact and comfortable content box heights', () => {
    expect(persesPrimitiveStyles).toMatch(
      /data-log-density='compact'[\s\S]*data-log-index[^}]*min-height:\s*30px[^}]*padding-block:\s*2px/s
    );
    expect(persesPrimitiveStyles).toMatch(
      /data-log-density='comfortable'[\s\S]*data-log-index[^}]*min-height:\s*36px[^}]*padding-block:\s*4px/s
    );
    expect(persesPrimitiveStyles).toMatch(
      /data-log-index[^}]*div:last-of-type\s+button\)\s*\{[^}]*width:\s*24px[^}]*height:\s*24px[^}]*min-height:\s*24px/s
    );
  });

  it('resets a sanitized runtime failure when the query identity changes', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    runtimeControl.fail = true;
    const view = render(
      <HertzBeatMetricTimeSeriesResult
        outcome={metricOutcome() as never}
        title="Metrics"
        ariaLabel="Metric time series"
        query={{ signal: 'metrics', queryKind: 'time-series', timeWindow, metric: { name: 'up' } }}
        messages={messages}
      />
    );
    expect(await screen.findByRole('alert', { name: 'Metric time series' })).toHaveTextContent(
      'Visualization unavailable'
    );
    expect(screen.queryByText('private runtime detail')).not.toBeInTheDocument();

    runtimeControl.fail = false;
    view.rerender(
      <HertzBeatMetricTimeSeriesResult
        outcome={metricOutcome() as never}
        title="Metrics"
        ariaLabel="Metric time series"
        query={{ signal: 'metrics', queryKind: 'time-series', timeWindow, metric: { name: 'cpu_usage' } }}
        messages={messages}
      />
    );
    expect(await screen.findByTestId('official-metric-time-series')).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('renders every official primitive from M2 typed ready outcomes', async () => {
    const view = render(
      <HertzBeatMetricTimeSeriesResult
        outcome={metricOutcome() as never}
        title="Metrics"
        ariaLabel="Metric time series"
        query={{ signal: 'metrics', queryKind: 'time-series', timeWindow, metric: { name: 'up' } }}
        messages={messages}
      />
    );
    expect(await screen.findByTestId('official-metric-time-series')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Metric time series' })).toHaveStyle({ height: '360px' });
    expect(view.container.querySelector('[data-visualization-runtime="perses"]')).toHaveStyle({
      minHeight: '388px',
      gridTemplateRows: '360px auto'
    });
    expect(screen.getByRole('status', { name: 'Metric time series completeness' })).toHaveTextContent(
      'Result completeness is unknown'
    );

    view.rerender(
      <HertzBeatLogsTableResult
        outcome={logOutcome() as never}
        title="Logs"
        ariaLabel="Logs table"
        query={{ signal: 'logs', queryKind: 'table', timeWindow }}
        logDisplay={{ density: 'compact', wrap: false, showTime: false }}
        messages={messages}
      />
    );
    expect(await screen.findByTestId('official-logs-table')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Logs table' })).toContainElement(
      screen.getByRole('table', { name: 'official logs-table' })
    );
    expect(view.container.querySelector('[data-visualization-runtime="perses"]')).toHaveAttribute(
      'data-log-density',
      'compact'
    );
    expect(view.container.querySelector('[data-visualization-runtime="perses"]')).toHaveAttribute(
      'data-log-wrap',
      'false'
    );
    expect(view.container.querySelector('[data-visualization-runtime="perses"]')).toHaveAttribute(
      'data-log-show-time',
      'false'
    );
    const completeness = screen.getByRole('status', { name: 'Logs table completeness' });
    expect(completeness).toHaveTextContent('Results are truncated');
    expect(completeness).toHaveStyle({ height: '28px', minHeight: '28px' });

    view.rerender(
      <HertzBeatTraceTableResult
        outcome={traceTableOutcome() as never}
        title="Traces"
        ariaLabel="Trace table"
        query={{ signal: 'traces', queryKind: 'table', timeWindow }}
        messages={messages}
      />
    );
    expect(await screen.findByTestId('official-trace-table')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Trace table' })).toContainElement(
      screen.getByRole('table', { name: 'official trace-table' })
    );

    view.rerender(
      <HertzBeatTracingGanttChartResult
        outcome={traceDetailOutcome() as never}
        title="Trace"
        ariaLabel="Trace gantt"
        query={{ signal: 'traces', queryKind: 'gantt', timeWindow, traceId: '0123456789abcdef0123456789abcdef' }}
        messages={messages}
      />
    );
    expect(await screen.findByTestId('official-tracing-gantt-chart')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Trace gantt' })).toContainElement(
      screen.getByRole('button', { name: 'Inspect span' })
    );
  });

  it('keeps loaded evidence inside the native runtime without a duplicate host action sidecar', () => {
    const view = render(
      <HertzBeatLogsTableResult
        title="Logs"
        ariaLabel="Logs table"
        query={{ signal: 'logs', queryKind: 'table', timeWindow }}
        outcome={logOutcome() as never}
        runtimeIdentity="scope-a:revision-1"
        messages={messages}
      />
    );

    expect(view.container.querySelector('[data-perses-host-interactions]')).toBeNull();
    expect(view.container.querySelector('[data-visualization-runtime="perses"]')).toHaveStyle({
      gridTemplateRows: '360px auto'
    });

    view.rerender(
      <HertzBeatLogsTableResult
        title="Logs"
        ariaLabel="Logs table"
        query={{ signal: 'logs', queryKind: 'table', timeWindow }}
        outcome={logOutcome() as never}
        runtimeIdentity="scope-b:revision-1"
        messages={messages}
      />
    );
    expect(screen.queryByRole('button', { name: 'Investigate log checkout ready' })).not.toBeInTheDocument();
  });

  it('forwards host-owned log row selection through the thin official LogsTable adapter boundary', () => {
    const rowSelection = {
      ariaLabel: 'Historical logs',
      controlsId: 'log-inspector',
      selectedIndex: 0,
      getAriaLabel: () => 'Selected log',
      onSelect: vi.fn()
    };
    render(
      <HertzBeatLogsTableResult
        title="Logs"
        ariaLabel="Logs table"
        query={{ signal: 'logs', queryKind: 'table', timeWindow }}
        outcome={logOutcome() as never}
        runtimeIdentity="scope-a:revision-1"
        logRowSelection={rowSelection}
        messages={messages}
      />
    );

    expect(runtimeControl.rowSelection).toBe(rowSelection);
  });

  it('forwards a time-series zoom only when the caller owns a callback', () => {
    const onTimeWindowChange = vi.fn();
    render(
      <HertzBeatMetricTimeSeriesResult
        title="Log trend"
        ariaLabel="Log trend"
        query={{ signal: 'metrics', queryKind: 'time-series', timeWindow, metric: { name: 'hertzbeat_log_count' } }}
        outcome={metricOutcome() as never}
        onTimeWindowChange={onTimeWindowChange}
        messages={messages}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Zoom time series' }));
    expect(onTimeWindowChange).toHaveBeenCalledWith({ from: timeWindow.from + 1_000, to: timeWindow.to - 1_000 });
  });

  it('forwards a disabled time-series range interaction to the Perses runtime', () => {
    render(
      <HertzBeatMetricTimeSeriesResult
        title="Retained Log trend"
        ariaLabel="Retained Log trend"
        query={{ signal: 'metrics', queryKind: 'time-series', timeWindow, metric: { name: 'hertzbeat_log_count' } }}
        outcome={metricOutcome() as never}
        timeWindowChangeEnabled={false}
        messages={messages}
      />
    );

    expect(screen.getByRole('button', { name: 'Zoom time series' })).toBeDisabled();
  });
});

function metricOutcome(): HertzBeatQueryOutcome<unknown> {
  return {
    state: 'ready',
    data: {
      timeWindow,
      source: 'Greptime-promql',
      series: [
        { key: 'up-0', name: 'up', labels: { __name__: 'up' }, points: [{ timestamp: timeWindow.from, value: 1 }] }
      ]
    },
    truncated: 'unknown'
  };
}

function logOutcome(): HertzBeatQueryOutcome<unknown> {
  return {
    state: 'ready',
    data: {
      total: 2,
      rows: [
        {
          timeUnixNano: 1_750_000_001_000_000_000,
          observedTimeUnixNano: null,
          severityNumber: 9,
          severityText: 'INFO',
          body: 'checkout ready',
          attributes: {},
          droppedAttributesCount: 0,
          traceId: '0123456789abcdef0123456789abcdef',
          spanId: '0123456789abcdef',
          traceFlags: 1,
          resource: { 'service.name': 'checkout' },
          resourceSchemaUrl: null,
          instrumentationScope: null,
          scopeSchemaUrl: null
        }
      ]
    },
    truncated: true
  };
}

function traceTableOutcome(): HertzBeatQueryOutcome<unknown> {
  return {
    state: 'ready',
    data: {
      total: 1,
      rows: [
        {
          rootState: 'unique',
          rootSpanCount: 1,
          representativeSpan: {
            spanId: '0123456789abcdef',
            spanName: 'POST /orders',
            serviceName: 'checkout',
            serviceNamespace: 'commerce',
            startTime: timeWindow.from,
            durationNanos: 10_000_000
          },
          observedStartTime: timeWindow.from,
          observedEndTime: timeWindow.from + Math.ceil(10_000_000 / 1_000_000),
          unattributedServiceStats: null,
          traceId: '0123456789abcdef0123456789abcdef',
          rootSpanId: '0123456789abcdef',
          serviceName: 'checkout',
          serviceNamespace: 'commerce',
          rootSpanName: 'POST /orders',
          durationNanos: 10_000_000,
          status: 'OK',
          startTime: timeWindow.from,
          spanCount: 2,
          errorSpanCount: 0,
          serviceStats: { checkout: { spanCount: 2, errorCount: 0 } },
          resourceAttributes: {}
        }
      ]
    },
    truncated: false
  };
}

function traceDetailOutcome(): HertzBeatQueryOutcome<unknown> {
  return {
    state: 'ready',
    data: {
      rootState: 'unique',
      rootSpanCount: 1,
      missingParentCount: 0,
      representativeSpan: {
        spanId: '0123456789abcdef',
        spanName: 'POST /orders',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        startTime: timeWindow.from,
        durationNanos: Number(10_000_000)
      },
      observedStartTime: timeWindow.from,
      observedEndTime: timeWindow.from + Math.ceil(Number(10_000_000) / 1_000_000),
      traceId: '0123456789abcdef0123456789abcdef',
      rootSpanId: '0123456789abcdef',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      rootSpanName: 'POST /orders',
      durationNanos: 10_000_000,
      status: 'OK',
      startTime: timeWindow.from,
      errorSpanCount: 0,
      resourceAttributes: {},
      spans: [
        {
          startTimeUnixNano: (BigInt(timeWindow.from) * 1_000_000n).toString(),
          traceId: '0123456789abcdef0123456789abcdef',
          spanId: '0123456789abcdef',
          parentSpanId: null,
          spanName: 'POST /orders',
          serviceName: 'checkout',
          status: 'OK',
          spanKind: 'SERVER',
          statusMessage: null,
          traceState: null,
          scopeName: 'checkout-http',
          scopeVersion: null,
          durationNanos: 10_000_000,
          startTime: timeWindow.from,
          highlighted: false,
          resourceAttributes: { 'service.name': 'checkout' },
          spanAttributes: {},
          events: [],
          links: [],
          codeNavigationHint: null
        }
      ]
    },
    truncated: false
  };
}
