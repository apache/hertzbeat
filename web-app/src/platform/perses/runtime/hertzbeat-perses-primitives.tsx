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

import type {
  HertzBeatLogTableQuery,
  HertzBeatMetricQuery,
  HertzBeatMetricCompositionQuery,
  HertzBeatQueryOutcome,
  HertzBeatTraceGanttQuery,
  HertzBeatTraceTableQuery
} from '../datasource/hertzbeat-query-contract';
import type {
  HertzBeatLogRow,
  HertzBeatMetricData,
  HertzBeatTableData,
  HertzBeatTraceDetail,
  HertzBeatTraceRow
} from '../datasource/hertzbeat-query-schema';
import { toPersesLogData, toPersesTraceDetailData, toPersesTraceSearchData } from './perses-signal-data';
import {
  HertzBeatPrimitiveFrame,
  type HertzBeatPrimitiveFrameProps,
  type HertzBeatPersesPrimitiveMessages,
  type PrimitiveState,
  type SharedPrimitiveProps
} from './hertzbeat-perses-primitive-frame';
import { toPersesTimeSeriesData } from './perses-time-series-model';
export type { HertzBeatPersesPrimitiveMessages };

export type HertzBeatMetricQueryOutcome = HertzBeatQueryOutcome<HertzBeatMetricData>;
export type HertzBeatLogQueryOutcome = HertzBeatQueryOutcome<HertzBeatTableData<HertzBeatLogRow>>;
export type HertzBeatTraceTableQueryOutcome = HertzBeatQueryOutcome<HertzBeatTableData<HertzBeatTraceRow>>;
export type HertzBeatTraceGanttQueryOutcome = HertzBeatQueryOutcome<HertzBeatTraceDetail>;
export type HertzBeatTraceQueryOutcome = HertzBeatTraceTableQueryOutcome | HertzBeatTraceGanttQueryOutcome;

export function HertzBeatMetricTimeSeriesResult(
  props: SharedPrimitiveProps & {
    query: HertzBeatMetricQuery | HertzBeatMetricCompositionQuery;
    outcome: HertzBeatQueryOutcome<HertzBeatMetricData>;
  }
) {
  return renderPrimitive(props, resolvedState(props.query, props.outcome, props.runtimeIdentity), outcome => ({
    kind: 'metric-time-series' as const,
    title: props.title,
    timeWindow: props.query.timeWindow,
    data: toPersesTimeSeriesData(outcome.data.series, props.query.timeWindow),
    display: props.timeSeriesDisplay,
    legend: props.timeSeriesLegend,
    compact: props.timeSeriesCompact,
    countAxisMax: props.timeSeriesCountAxisMax,
    renderTimestamp: props.timeSeriesTimestamp,
    yDomain: props.timeSeriesYDomain,
    panel: props.metricPanel,
    onTimeWindowChange: props.onTimeWindowChange,
    timeWindowChangeEnabled: props.timeWindowChangeEnabled
  }));
}

export function HertzBeatLogsTableResult(
  props: SharedPrimitiveProps & {
    query: HertzBeatLogTableQuery;
    outcome: HertzBeatQueryOutcome<HertzBeatTableData<HertzBeatLogRow>>;
  }
) {
  return renderPrimitive(props, resolvedState(props.query, props.outcome, props.runtimeIdentity), outcome => ({
    kind: 'logs-table' as const,
    title: props.title,
    timeWindow: props.query.timeWindow,
    data: toPersesLogData(
      outcome.data,
      props.query.timeWindow,
      props.preserveLogOrder || props.query.logSort ? 'preserve' : props.query.sort
    ),
    ...(props.logDisplay ? { display: props.logDisplay } : {}),
    ...(props.logRowSelection ? { rowSelection: props.logRowSelection } : {})
  }));
}

export function HertzBeatTraceTableResult(
  props: SharedPrimitiveProps & {
    query: HertzBeatTraceTableQuery;
    outcome: HertzBeatQueryOutcome<HertzBeatTableData<HertzBeatTraceRow>>;
  }
) {
  return renderPrimitive(props, resolvedState(props.query, props.outcome, props.runtimeIdentity), outcome => ({
    kind: 'trace-table' as const,
    display: props.traceDisplay,
    title: props.title,
    timeWindow: props.query.timeWindow,
    data: toPersesTraceSearchData(outcome.data, outcome.truncated === true),
    rows: outcome.data.rows,
    links: props.traceLinks,
    unavailableLinks: props.traceUnavailableLinks,
    serverPagination: props.tracePagination,
    onNavigate: props.onTraceNavigate
  }));
}

export function HertzBeatTracingGanttChartResult(
  props: SharedPrimitiveProps & {
    query: HertzBeatTraceGanttQuery;
    outcome: HertzBeatQueryOutcome<HertzBeatTraceDetail>;
  }
) {
  return renderPrimitive(props, resolvedState(props.query, props.outcome, props.runtimeIdentity), outcome => ({
    kind: 'tracing-gantt-chart' as const,
    title: props.title,
    timeWindow: props.query.timeWindow,
    data: toPersesTraceDetailData(outcome.data),
    selectedSpanId: props.query.spanId,
    onSpanSelect: props.onSpanSelect,
    evidenceIdentity: props.runtimeIdentity
  }));
}

function renderPrimitive<Data>(
  props: SharedPrimitiveProps,
  state: PrimitiveState<Data>,
  toRuntimeProps: HertzBeatPrimitiveFrameProps<Data>['toRuntimeProps']
) {
  return <HertzBeatPrimitiveFrame {...props} state={state} toRuntimeProps={toRuntimeProps} />;
}

function resolvedState<Query, Data>(
  query: Query,
  outcome: HertzBeatQueryOutcome<Data>,
  runtimeIdentity?: string
): PrimitiveState<Data> {
  return { kind: 'resolved', queryKey: runtimeIdentity ?? JSON.stringify(query), outcome };
}
