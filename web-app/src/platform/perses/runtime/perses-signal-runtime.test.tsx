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

import { cleanup, render } from '@testing-library/react';
import type { PanelDefinition, QueryDefinition } from '@perses-dev/spec';
import { getTimeSeries } from '@perses-dev/timeseries-chart-plugin/lib/utils/data-transform.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

const runtimeContract = vi.hoisted(() => ({
  panels: [] as PanelDefinition[],
  queries: [] as QueryDefinition[][],
  pluginLoaders: [] as unknown[],
  timeWindowCallbacks: [] as Array<unknown>,
  timeWindowChangeFlags: [] as Array<boolean | undefined>,
  contentSurfaces: [] as Array<boolean | undefined>
}));

vi.mock('./hertzbeat-trace-table-adapter', () => ({ HertzBeatTraceTableAdapter: () => <div>Native trace table</div> }));
vi.mock('./hertzbeat-tracing-gantt-adapter', () => ({ HertzBeatTracingGanttAdapter: () => <div>Native Gantt</div> }));

vi.mock('@perses-dev/dashboards', () => ({
  Panel: ({ definition }: { definition: PanelDefinition }) => {
    runtimeContract.panels.push(definition);
    return <div data-testid="perses-panel" />;
  }
}));
vi.mock('@perses-dev/plugin-system', () => ({
  DataQueriesContext: {
    Provider: ({
      value,
      children
    }: {
      value: { queryDefinitions: QueryDefinition[] };
      children: import('react').ReactNode;
    }) => {
      runtimeContract.queries.push(value.queryDefinitions);
      return children;
    }
  },
  DataQueriesProvider: ({
    children,
    definitions
  }: {
    children: import('react').ReactNode;
    definitions: QueryDefinition[];
  }) => {
    runtimeContract.queries.push(definitions);
    return children;
  }
}));
vi.mock('./perses-runtime-providers', () => ({
  PersesRuntimeProviders: ({
    children,
    pluginLoader,
    onTimeWindowChange,
    timeWindowChangeEnabled,
    contentSurface
  }: {
    children: import('react').ReactNode;
    pluginLoader: unknown;
    onTimeWindowChange?: unknown;
    timeWindowChangeEnabled?: boolean | undefined;
    contentSurface?: boolean | undefined;
  }) => {
    runtimeContract.pluginLoaders.push(pluginLoader);
    runtimeContract.timeWindowCallbacks.push(onTimeWindowChange);
    runtimeContract.timeWindowChangeFlags.push(timeWindowChangeEnabled);
    runtimeContract.contentSurfaces.push(contentSurface);
    return children;
  }
}));
vi.mock('../plugins/perses-multi-signal-plugin-loader', () => ({
  hertzBeatPersesMultiSignalPluginLoader: { kind: 'multi-signal-loader' }
}));

import { hertzBeatPersesMultiSignalPluginLoader } from '../plugins/perses-multi-signal-plugin-loader';
import { PersesSignalRuntime, type PersesSignalRuntimeProps } from './perses-signal-runtime';

const timeWindow = { from: 1_750_000_000_000, to: 1_750_000_060_000 } as const;

describe('PersesSignalRuntime', () => {
  afterEach(() => {
    cleanup();
    runtimeContract.panels = [];
    runtimeContract.queries = [];
    runtimeContract.pluginLoaders = [];
    runtimeContract.timeWindowCallbacks = [];
    runtimeContract.timeWindowChangeFlags = [];
    runtimeContract.contentSurfaces = [];
  });

  it('routes each typed snapshot to the matching official Perses panel and query kind', () => {
    const cases: Array<{
      props: PersesSignalRuntimeProps;
      panelKind: string;
      queryKind: string;
      snapshotKind: string;
    }> = [
      {
        props: {
          kind: 'metric-time-series',
          title: 'Metric',
          timeWindow,
          data: {
            timeRange: { start: new Date(timeWindow.from), end: new Date(timeWindow.to) },
            stepMs: 15_000,
            series: []
          }
        },
        panelKind: 'TimeSeriesChart',
        queryKind: 'TimeSeriesQuery',
        snapshotKind: 'HertzBeatSnapshotTimeSeriesQuery'
      },
      {
        props: { kind: 'logs-table', title: 'Logs', timeWindow, data: { entries: [] } },
        panelKind: 'LogsTable',
        queryKind: 'LogQuery',
        snapshotKind: 'HertzBeatSnapshotLogQuery'
      }
    ];

    for (const item of cases) {
      const view = render(<PersesSignalRuntime {...item.props} />);
      const panel = runtimeContract.panels.at(-1);
      const query = runtimeContract.queries.at(-1)?.[0];
      expect(panel?.spec.plugin.kind).toBe(item.panelKind);
      expect(query?.kind).toBe(item.queryKind);
      expect(query?.spec.plugin.kind).toBe(item.snapshotKind);
      expect(runtimeContract.pluginLoaders.at(-1)).toBe(hertzBeatPersesMultiSignalPluginLoader);
      if (item.props.kind === 'logs-table') {
        expect(panel?.spec.plugin.spec).toMatchObject({
          allowWrap: false,
          enableDetails: true,
          showTime: true,
          showSelectionHints: false
        });
      }
      view.unmount();
    }
  });

  it('keeps the log table subtree mounted when the received buffer window advances', () => {
    const props = { kind: 'logs-table' as const, title: 'Live logs', timeWindow, data: { entries: [] } };
    const view = render(<PersesSignalRuntime {...props} />);
    const table = view.getByTestId('perses-panel');
    view.rerender(<PersesSignalRuntime {...props} timeWindow={{ from: timeWindow.from, to: timeWindow.to + 1000 }} />);
    expect(view.getByTestId('perses-panel')).toBe(table);
  });

  it('does not expand legacy comfortable rows when wrapping is disabled', () => {
    render(
      <PersesSignalRuntime
        kind="logs-table"
        title="Logs"
        timeWindow={timeWindow}
        data={{ entries: [] }}
        display={{ density: 'comfortable', wrap: false, showTime: true }}
      />
    );
    expect(runtimeContract.panels.at(-1)?.spec.plugin.spec).toMatchObject({ allowWrap: false, rowHeight: 'small' });
  });

  it('forwards host log display preferences to the official LogsTable spec', () => {
    const view = render(
      <PersesSignalRuntime
        kind="logs-table"
        title="Logs"
        timeWindow={timeWindow}
        data={{ entries: [] }}
        display={{
          density: 'compact',
          wrap: false,
          showTime: false,
          rowHeight: 'large',
          contentDisplay: 'attributes',
          showContent: false,
          copyLabels: {
            copyOptions: 'Copy options',
            copied: 'Copied!',
            menu: 'Copy format options',
            copyTimestamp: 'Copy log',
            copyTimestampDescription: 'Timestamp + labels + message',
            copyMessage: 'Copy message',
            copyMessageDescription: 'Message text only',
            copyJson: 'Copy as JSON',
            copyJsonDescription: 'Full log entry'
          }
        }}
      />
    );

    expect(runtimeContract.panels.at(-1)?.spec.plugin.spec).toMatchObject({
      allowWrap: true,
      showTime: false,
      rowHeight: 'large',
      contentDisplay: 'attributes',
      showContent: false,
      copyLabels: { copyTimestamp: 'Copy log', copyMessage: 'Copy message', copyJson: 'Copy as JSON' }
    });
    view.unmount();
  });

  it('uses bars only when the caller identifies a histogram-style time series', () => {
    const data = {
      timeRange: { start: new Date(timeWindow.from), end: new Date(timeWindow.to) },
      stepMs: 60_000,
      series: []
    };
    const line = render(
      <PersesSignalRuntime kind="metric-time-series" title="Metric" timeWindow={timeWindow} data={data} />
    );
    expect(runtimeContract.panels.at(-1)?.spec.plugin.spec).toMatchObject({ visual: { display: 'line' } });
    line.unmount();

    render(
      <PersesSignalRuntime
        kind="metric-time-series"
        title="Log trend"
        timeWindow={timeWindow}
        data={data}
        display="bar"
      />
    );
    expect(runtimeContract.panels.at(-1)?.spec.plugin.spec).toMatchObject({
      visual: { display: 'bar' },
      yAxis: { show: true, min: 0 }
    });
    const visual = runtimeContract.panels.at(-1)?.spec.plugin.spec.visual as Parameters<typeof getTimeSeries>[3];
    const nativeBar = getTimeSeries(
      'count',
      0,
      'count',
      visual,
      { rangeMs: 60_000 } as Parameters<typeof getTimeSeries>[4],
      '#333'
    );
    expect(nativeBar).toMatchObject({ type: 'bar' });
    expect(nativeBar).not.toHaveProperty('barWidth');
    expect(nativeBar).not.toHaveProperty('barMaxWidth');
  });

  it('shows sparse numeric points through twenty valid samples and hides dense symbols without joining gaps', () => {
    const values = Array.from(
      { length: 25 },
      (_, index) => [timeWindow.from + index * 1000, index < 20 ? index : null] as [number, number | null]
    );
    const data = {
      timeRange: { start: new Date(timeWindow.from), end: new Date(timeWindow.to) },
      series: [{ name: 'rate', values }]
    };
    const sparse = render(
      <PersesSignalRuntime kind="metric-time-series" title="Rate" timeWindow={timeWindow} data={data} />
    );
    expect(runtimeContract.panels.at(-1)?.spec.plugin.spec).toMatchObject({
      visual: { display: 'line', showPoints: 'always', pointRadius: 4, connectNulls: false }
    });
    const sparseVisual = runtimeContract.panels.at(-1)?.spec.plugin.spec.visual as Parameters<typeof getTimeSeries>[3];
    expect(
      getTimeSeries('rate', 0, 'rate', sparseVisual, { rangeMs: 60_000 } as Parameters<typeof getTimeSeries>[4], '#333')
    ).toMatchObject({ type: 'line', showSymbol: true, symbolSize: 4, connectNulls: false });
    sparse.unmount();
    render(
      <PersesSignalRuntime
        kind="metric-time-series"
        title="Rate"
        timeWindow={timeWindow}
        data={{ ...data, series: [{ name: 'rate', values: [...values, [timeWindow.to, 21]] }] }}
      />
    );
    expect(runtimeContract.panels.at(-1)?.spec.plugin.spec).toMatchObject({
      visual: { display: 'line', showPoints: 'auto', pointRadius: 0, connectNulls: false }
    });
    const denseVisual = runtimeContract.panels.at(-1)?.spec.plugin.spec.visual as Parameters<typeof getTimeSeries>[3];
    expect(
      getTimeSeries('rate', 0, 'rate', denseVisual, { rangeMs: 60_000 } as Parameters<typeof getTimeSeries>[4], '#333')
    ).toMatchObject({ type: 'line', symbolSize: 0, connectNulls: false });
  });

  it('uses an integer axis only for an identified compact log count, preserving fractional metrics', () => {
    const data = { timeRange: { start: new Date(timeWindow.from), end: new Date(timeWindow.to) }, series: [] };
    const count = render(
      <PersesSignalRuntime
        kind="metric-time-series"
        title="Log count"
        timeWindow={timeWindow}
        data={data}
        display="bar"
        compact
        countAxisMax={0}
      />
    );
    expect(runtimeContract.panels.at(-1)?.spec.plugin.spec).toMatchObject({ yAxis: { show: true, min: 0, max: 1 } });
    count.unmount();
    render(
      <PersesSignalRuntime
        kind="metric-time-series"
        title="Average"
        timeWindow={timeWindow}
        data={data}
        yDomain={{ min: 0, max: 1.5 }}
      />
    );
    expect(runtimeContract.panels.at(-1)?.spec.plugin.spec).toMatchObject({ yAxis: { show: true, min: 0, max: 1.5 } });
  });

  it.each([false, true])('does not clip negative bar samples to a zero minimum (compact: %s)', compact => {
    render(
      <PersesSignalRuntime
        kind="metric-time-series"
        title="Delta"
        compact={compact}
        timeWindow={timeWindow}
        display="bar"
        data={{
          timeRange: { start: new Date(timeWindow.from), end: new Date(timeWindow.to) },
          series: [
            {
              name: 'delta',
              values: [
                [timeWindow.from, -5],
                [timeWindow.to, 3]
              ]
            }
          ]
        }}
      />
    );
    expect(runtimeContract.panels.at(-1)?.spec.plugin.spec).not.toHaveProperty('yAxis.min', 0);
  });

  it('uses the official small legend within the flat host content surface for metrics', () => {
    render(
      <PersesSignalRuntime
        kind="metric-time-series"
        title="Metric"
        timeWindow={timeWindow}
        data={{ timeRange: { start: new Date(timeWindow.from), end: new Date(timeWindow.to) }, series: [] }}
      />
    );
    expect(runtimeContract.panels.at(-1)?.spec.plugin.spec).toMatchObject({
      legend: { position: 'bottom', size: 'small' }
    });
    expect(runtimeContract.contentSurfaces.at(-1)).toBe(true);
  });

  it('keeps the native axis layout gutters without a redundant legend for compact log trends', () => {
    render(
      <PersesSignalRuntime
        kind="metric-time-series"
        title="Log trend"
        timeWindow={timeWindow}
        data={{ timeRange: { start: new Date(timeWindow.from), end: new Date(timeWindow.to) }, series: [] }}
        display="bar"
        compact
      />
    );
    expect(runtimeContract.panels.at(-1)?.spec.plugin.spec).toMatchObject({ yAxis: { show: true, min: 0 } });
    expect(runtimeContract.panels.at(-1)?.spec.plugin.spec).toMatchObject({
      visual: { palette: { mode: 'categorical' } }
    });
    expect(runtimeContract.panels.at(-1)?.spec.plugin.spec).not.toHaveProperty('legend');
  });

  it('disables official inline details only when the host provides an Inspector row selection', () => {
    render(
      <PersesSignalRuntime
        kind="logs-table"
        title="Logs"
        timeWindow={timeWindow}
        data={{ entries: [] }}
        rowSelection={{
          ariaLabel: 'Historical logs',
          controlsId: 'log-inspector',
          getAriaLabel: index => `Log ${index + 1}`,
          onSelect: vi.fn()
        }}
      />
    );

    expect(runtimeContract.panels.at(-1)?.spec.plugin.spec).toMatchObject({ enableDetails: false });
  });

  it('forwards a host time-window callback only for a metric time-series runtime', () => {
    const onTimeWindowChange = vi.fn();
    const metric = render(
      <PersesSignalRuntime
        kind="metric-time-series"
        title="Metric"
        timeWindow={timeWindow}
        data={{ timeRange: { start: new Date(timeWindow.from), end: new Date(timeWindow.to) }, series: [] }}
        onTimeWindowChange={onTimeWindowChange}
      />
    );
    expect(runtimeContract.timeWindowCallbacks.at(-1)).toBe(onTimeWindowChange);
    expect(runtimeContract.timeWindowChangeFlags.at(-1)).toBe(true);
    metric.unmount();

    const logs = render(
      <PersesSignalRuntime kind="logs-table" title="Logs" timeWindow={timeWindow} data={{ entries: [] }} />
    );
    expect(runtimeContract.timeWindowCallbacks.at(-1)).toBeUndefined();
    logs.unmount();
  });

  it('disables metric time-window interaction when the host marks retained evidence stale', () => {
    render(
      <PersesSignalRuntime
        kind="metric-time-series"
        title="Retained metric"
        timeWindow={timeWindow}
        data={{ timeRange: { start: new Date(timeWindow.from), end: new Date(timeWindow.to) }, series: [] }}
        timeWindowChangeEnabled={false}
      />
    );

    expect(runtimeContract.timeWindowChangeFlags.at(-1)).toBe(false);
  });
});
it('passes the shared split scale to the native panel axis', () => {
  render(
    <PersesSignalRuntime
      kind="metric-time-series"
      title="Split"
      timeWindow={timeWindow}
      data={{ series: [] }}
      yDomain={{ min: -10, max: 20 }}
    />
  );
  expect(runtimeContract.panels.at(-1)?.spec.plugin.spec).toMatchObject({ yAxis: { show: true, min: -10, max: 20 } });
  cleanup();
});
it('renders bars, hides the legend and applies a zero lower bound without forcing an upper bound', () => {
  render(
    <PersesSignalRuntime
      kind="metric-time-series"
      title="Metric"
      timeWindow={timeWindow}
      data={{ timeRange: { start: new Date(timeWindow.from), end: new Date(timeWindow.to) }, series: [] }}
      display="bar"
      legend={false}
      yDomain={{ min: 0 }}
    />
  );
  expect(runtimeContract.panels.at(-1)?.spec.plugin.spec).toMatchObject({
    visual: { display: 'bar' },
    yAxis: { show: true, min: 0 }
  });
  expect(runtimeContract.panels.at(-1)?.spec.plugin.spec).not.toHaveProperty('legend');
  expect(runtimeContract.panels.at(-1)?.spec.plugin.spec).not.toHaveProperty('yAxis.max');
  cleanup();
});
it('rejects invalid axis domains before creating a plugin panel', () => {
  const before = runtimeContract.panels.length;
  expect(() =>
    render(
      <PersesSignalRuntime
        kind="metric-time-series"
        title="Metric"
        timeWindow={timeWindow}
        data={{ timeRange: { start: new Date(timeWindow.from), end: new Date(timeWindow.to) }, series: [] }}
        yDomain={{ min: Infinity, max: 0 }}
      />
    )
  ).toThrow();
  expect(runtimeContract.panels).toHaveLength(before);
  cleanup();
});
