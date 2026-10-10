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

import { metricAxisBoundsValid, metricAxisDataExtent } from '../metrics/metric-axis-domain';
import { metricAxisScaleValid } from '../metrics/metric-axis-scale';
import { PersesSignalDataError } from './perses-signal-data';
import { resolveLogRowHeight } from '../logs/log-view';
import type { HertzBeatTraceDisplay } from './perses-trace-display';
/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { TraceTableServerPagination } from '@perses-dev/trace-table-plugin';
import { Panel } from '@perses-dev/dashboards';
import { DataQueriesContext, DataQueriesProvider, type DataQueriesContextType } from '@perses-dev/plugin-system';
import type { LogData, PanelDefinition, QueryDefinition, TimeSeriesData, TraceData } from '@perses-dev/spec';
import type { TraceTableData } from '@perses-dev/trace-table-plugin';
import type { TraceEvidence } from '@/shared/trace-evidence';
import { HertzBeatTracingGanttAdapter } from './hertzbeat-tracing-gantt-adapter';
import { HertzBeatTraceTableAdapter } from './hertzbeat-trace-table-adapter';
import { useMemo, type ReactNode } from 'react';
import { PersesTooltipTimestampContext } from './perses-tooltip-context';

import type { ExactTimeWindow } from '@/shared/query-context';
import type { HertzBeatLogTableDisplay } from './perses-log-display';
import { HertzBeatLogsTableAdapter, type HertzBeatLogRowSelection } from './hertzbeat-logs-table-adapter';

import { hertzBeatPersesMultiSignalPluginLoader } from '../plugins/perses-multi-signal-plugin-loader';
import { HERTZBEAT_SNAPSHOT_LOG_QUERY_KIND, HERTZBEAT_SNAPSHOT_QUERY_KIND } from '../plugins/hertzbeat-snapshot-query';
import { PersesRuntimeProviders } from './perses-runtime-providers';
import styles from './perses-time-series.module.css';

export type PersesSignalRuntimeProps =
  | {
      kind: 'metric-time-series';
      title: string;
      timeWindow: ExactTimeWindow;
      data: TimeSeriesData;
      legend?: boolean | undefined;
      display?: 'line' | 'bar' | undefined;
      compact?: boolean | undefined;
      countAxisMax?: number | undefined;
      renderTimestamp?: ((timestamp: number) => ReactNode) | undefined;
      yDomain?: { min?: number | undefined; max?: number | undefined } | undefined;
      panel?: { kind: 'StatChart' | 'GaugeChart' | 'Table'; max?: number } | undefined;
      onTimeWindowChange?: ((window: ExactTimeWindow) => void) | undefined;
      timeWindowChangeEnabled?: boolean | undefined;
    }
  | {
      kind: 'logs-table';
      title: string;
      timeWindow: ExactTimeWindow;
      data: LogData;
      display?: HertzBeatLogTableDisplay;
      rowSelection?: HertzBeatLogRowSelection;
    }
  | {
      kind: 'trace-table';
      display?: HertzBeatTraceDisplay | undefined;
      title: string;
      timeWindow: ExactTimeWindow;
      data: TraceTableData;
      rows: TraceEvidence[];
      serverPagination?: TraceTableServerPagination | undefined;
      links?: Readonly<Record<string, string>> | undefined;
      unavailableLinks?: Readonly<Record<string, string>> | undefined;
      onNavigate?: ((path: string) => void) | undefined;
    }
  | {
      kind: 'tracing-gantt-chart';
      title: string;
      timeWindow: ExactTimeWindow;
      data: TraceData;
      selectedSpanId?: string | undefined;
      onSpanSelect?: ((spanId: string | undefined) => void) | undefined;
      evidenceIdentity?: string | undefined;
    };

export function PersesSignalRuntime(props: PersesSignalRuntimeProps) {
  return (
    <div className={styles.frame} data-perses-runtime-state="ready" data-perses-primitive={props.kind}>
      <PersesRuntimeProviders
        key={props.kind === 'logs-table' ? 'logs' : `${props.timeWindow.from}:${props.timeWindow.to}`}
        timeWindow={props.timeWindow}
        pluginLoader={hertzBeatPersesMultiSignalPluginLoader}
        contentSurface
        compactChart={props.kind === 'metric-time-series' && props.compact}
        compactChartCountAxisMax={props.kind === 'metric-time-series' ? props.countAxisMax : undefined}
        enableChartPinning={props.kind === 'metric-time-series' && props.renderTimestamp !== undefined}
        onTimeWindowChange={props.kind === 'metric-time-series' ? props.onTimeWindowChange : undefined}
        timeWindowChangeEnabled={props.kind !== 'metric-time-series' || props.timeWindowChangeEnabled !== false}
      >
        <PersesTooltipTimestampContext.Provider
          value={props.kind === 'metric-time-series' ? props.renderTimestamp : undefined}
        >
          <RuntimeContents {...props} />
        </PersesTooltipTimestampContext.Provider>
      </PersesRuntimeProviders>
    </div>
  );
}

function RuntimeContents(props: PersesSignalRuntimeProps) {
  if (props.kind === 'trace-table') return <HertzBeatTraceTableAdapter {...props} />;
  if (props.kind === 'tracing-gantt-chart') return <HertzBeatTracingGanttAdapter {...props} />;
  return <SnapshotPanel {...props} />;
}

type SnapshotRuntimeProps = Extract<PersesSignalRuntimeProps, { kind: 'logs-table' | 'metric-time-series' }>;

function SnapshotPanel(props: SnapshotRuntimeProps) {
  const definition = useMemo(() => panelDefinition(props), [props]);
  const queries = useMemo(() => queryDefinitions(props), [props]);
  return (
    <SnapshotQueries props={props} definitions={queries}>
      {props.kind === 'logs-table' ? (
        <HertzBeatLogsTableAdapter {...logTableAdapterProps(props)}>
          <Panel panelOptions={{ hideHeader: true }} definition={definition} />
        </HertzBeatLogsTableAdapter>
      ) : (
        <Panel panelOptions={{ hideHeader: true }} definition={definition} />
      )}
    </SnapshotQueries>
  );
}

function SnapshotQueries({
  props,
  definitions,
  children
}: {
  props: SnapshotRuntimeProps;
  definitions: QueryDefinition[];
  children: ReactNode;
}) {
  if (props.kind !== 'logs-table')
    return <DataQueriesProvider definitions={definitions}>{children}</DataQueriesProvider>;
  // Logs are already authorized and loaded by the host. Re-querying each snapshot
  // enters a pending state and unmounts the virtual list on every arriving log.
  return (
    <DataQueriesContext.Provider
      value={
        // Perses 0.54 context types omit log query data and nullable success errors.
        {
          queryDefinitions: definitions,
          queryResults: definitions.map(definition => ({
            definition,
            data: {
              logs: props.data,
              timeRange: props.data.timeRange ?? {
                start: new Date(props.timeWindow.from),
                end: new Date(props.timeWindow.to)
              }
            },
            isFetching: false,
            isLoading: false,
            error: undefined
          })),
          isFetching: false,
          isLoading: false,
          errors: [],
          refetchAll: () => undefined
        } as unknown as DataQueriesContextType
      }
    >
      {children}
    </DataQueriesContext.Provider>
  );
}

function queryDefinitions(props: SnapshotRuntimeProps): QueryDefinition[] {
  if (props.kind === 'metric-time-series') {
    return [
      {
        kind: 'TimeSeriesQuery',
        spec: { plugin: { kind: HERTZBEAT_SNAPSHOT_QUERY_KIND, spec: { data: props.data } } }
      }
    ];
  }
  return [
    {
      kind: 'LogQuery',
      spec: { plugin: { kind: HERTZBEAT_SNAPSHOT_LOG_QUERY_KIND, spec: { data: props.data } } }
    }
  ];
}

function panelDefinition(props: SnapshotRuntimeProps): PanelDefinition {
  const display = { name: props.title };
  if (props.kind === 'metric-time-series') return metricPanelDefinition(props);
  return {
    kind: 'Panel',
    spec: {
      display,
      plugin: {
        kind: 'LogsTable',
        spec: logTablePluginOptions(props)
      }
    }
  };
}

function logTableAdapterProps(props: Extract<SnapshotRuntimeProps, { kind: 'logs-table' }>) {
  if (props.rowSelection) return props.rowSelection;
  const display = normalizedLogDisplay(props.display);
  return {
    columns: props.display?.columns,
    ariaLabel: props.title,
    timeZone: props.display?.timeZone,
    rowHeight: display.rowHeight,
    contentDisplay: display.contentDisplay,
    showContent: display.showContent,
    standardizeHeaders: display.standardizeHeaders
  };
}

function logTablePluginOptions(props: Extract<SnapshotRuntimeProps, { kind: 'logs-table' }>) {
  const display = normalizedLogDisplay(props.display);
  return {
    allowWrap: display.rowHeight !== 'small',
    rowHeight: display.rowHeight,
    contentDisplay: display.contentDisplay,
    showContent: display.showContent,
    standardizeHeaders: display.standardizeHeaders,
    showTimeline: display.showTimeline,
    copyLabels: display.copyLabels,
    enableDetails: props.rowSelection == null,
    showAll: true,
    showTime: display.showTime,
    showSelectionHints: false
  };
}

function normalizedLogDisplay(display: HertzBeatLogTableDisplay | undefined) {
  return {
    rowHeight: resolveLogRowHeight(display),
    contentDisplay: display?.contentDisplay ?? 'message',
    showContent: display?.showContent ?? true,
    standardizeHeaders: display?.standardizeHeaders ?? true,
    showTimeline: display?.showTimeline ?? true,
    showTime: display?.showTime ?? true,
    copyLabels: display?.copyLabels
  };
}

function metricPanelDefinition(props: Extract<SnapshotRuntimeProps, { kind: 'metric-time-series' }>): PanelDefinition {
  const display = { name: props.title };
  if (props.panel?.kind === 'StatChart')
    return {
      kind: 'Panel',
      spec: {
        display,
        plugin: { kind: 'StatChart', spec: { calculation: 'last-number', format: { unit: 'decimal' } } }
      }
    };
  if (props.panel?.kind === 'GaugeChart')
    return {
      kind: 'Panel',
      spec: {
        display,
        plugin: {
          kind: 'GaugeChart',
          spec: { calculation: 'last-number', format: { unit: 'decimal' }, max: props.panel.max ?? 100 }
        }
      }
    };
  if (props.panel?.kind === 'Table')
    return { kind: 'Panel', spec: { display, plugin: { kind: 'Table', spec: { density: 'compact' } } } };
  const axis = checkedMetricYAxis(props);
  return {
    kind: 'Panel',
    spec: {
      display,
      plugin: {
        kind: 'TimeSeriesChart',
        spec: {
          ...(props.compact || props.legend === false ? {} : { legend: { position: 'bottom', size: 'small' } }),
          ...axis,
          visual:
            props.display === 'bar'
              ? {
                  display: 'bar',
                  lineWidth: 0,
                  showPoints: 'auto',
                  ...(props.compact ? { palette: { mode: 'categorical' } } : {})
                }
              : lineVisual(props.data)
        }
      }
    }
  };
}

function checkedMetricYAxis(props: Extract<SnapshotRuntimeProps, { kind: 'metric-time-series' }>) {
  const axis = metricYAxis(props);
  if (
    !metricAxisScaleValid(
      axis.yAxis ?? {},
      metricAxisDataExtent(props.data.series.flatMap(item => item.values.map(([, value]) => value)))
    )
  )
    throw new PersesSignalDataError();
  return axis;
}

function lineVisual(data: TimeSeriesData) {
  const pointRadius = sparseLinePoints(data) ? 4 : 0;
  return {
    display: 'line',
    lineWidth: 1.75,
    showPoints: pointRadius ? 'always' : 'auto',
    pointRadius,
    connectNulls: false
  } as const;
}

function metricYAxis(props: Extract<SnapshotRuntimeProps, { kind: 'metric-time-series' }>) {
  if (
    props.compact &&
    props.display === 'bar' &&
    props.countAxisMax !== undefined &&
    Number.isFinite(props.countAxisMax) &&
    props.countAxisMax >= 0
  )
    return { yAxis: { show: true, min: 0, max: Math.max(1, Math.ceil(props.countAxisMax)) } };
  if (props.yDomain && !metricAxisBoundsValid(props.yDomain)) throw new PersesSignalDataError();
  if (validYDomain(props.yDomain)) return { yAxis: { show: true, ...props.yDomain } };
  return hasZeroBaseline(props) ? { yAxis: { show: true, min: 0 } } : {};
}

function validYDomain(domain: Extract<SnapshotRuntimeProps, { kind: 'metric-time-series' }>['yDomain']) {
  if (!domain || (domain.min === undefined && domain.max === undefined)) return false;
  return metricAxisBoundsValid(domain);
}

function sparseLinePoints(data: TimeSeriesData) {
  return data.series.every(
    series => series.values.filter(([, value]) => value !== null && Number.isFinite(value)).length <= 20
  );
}

function hasZeroBaseline(props: Extract<PersesSignalRuntimeProps, { kind: 'metric-time-series' }>) {
  return (
    (props.compact || props.display === 'bar') &&
    props.data.series.every(series => series.values.every(([, value]) => value == null || value >= 0))
  );
}
