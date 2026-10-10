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

export { queryHertzBeatData, HERTZBEAT_QUERY_LIMITS } from './datasource/hertzbeat-query-client';
export { orderHertzBeatLogRowsForPerses } from './runtime/perses-signal-data';
export type {
  HertzBeatQuery,
  HertzBeatLogTableQuery,
  HertzBeatMetricQuery,
  HertzBeatTraceGanttQuery,
  HertzBeatTraceTableQuery
} from './datasource/hertzbeat-query-contract';
export type {
  HertzBeatLogQueryOutcome,
  HertzBeatMetricQueryOutcome,
  HertzBeatTraceGanttQueryOutcome,
  HertzBeatTraceQueryOutcome,
  HertzBeatTraceTableQueryOutcome
} from './runtime/hertzbeat-perses-primitives';
export {
  HertzBeatLogsTableResult,
  HertzBeatMetricTimeSeriesResult,
  HertzBeatTraceTableResult,
  HertzBeatTracingGanttChartResult,
  type HertzBeatPersesPrimitiveMessages
} from './runtime/hertzbeat-perses-primitives';

export { parseHertzBeatDashboardDocument, type HertzBeatDashboardDocument } from './model/hertzbeat-dashboard-document';

export { hertzBeatQuerySchema } from './datasource/hertzbeat-query-contract';

export { TRACE_COLUMNS, DEFAULT_TRACE_COLUMNS } from './runtime/perses-trace-display';
export type { HertzBeatTraceColumn, HertzBeatTraceDisplay } from './runtime/perses-trace-display';

export {
  MAX_LOG_COLUMNS,
  DEFAULT_LOG_COLUMNS,
  logColumnId,
  logColumnSortField,
  validLogColumns,
  logColumnSchema
} from './model/log-column';
export type { LogColumn, LogColumnControls } from './model/log-column';
export type { HertzBeatLogRow } from './datasource/hertzbeat-query-schema';
export type { HertzBeatLogTableDisplay } from './runtime/perses-log-display';
export type { HertzBeatLogCopyLabels } from './runtime/perses-log-display';
export type { HertzBeatLogColumn } from './runtime/hertzbeat-log-columns';

export { TimeZoneProvider as HertzBeatTimeZoneProvider } from '@perses-dev/components';

export {
  type HertzBeatQueryFailure,
  type HertzBeatMetricCompositionQuery,
  type HertzBeatQueryOutcome
} from './datasource/hertzbeat-query-contract';
export { executeMetricComposition } from './metrics/metric-composition-executor';
export { loadHertzBeatTraceAnalytics, type TraceAnalyticsRequest } from './datasource/hertzbeat-trace-analytics-client';
export { HertzBeatResponseContractError } from './datasource/hertzbeat-response-errors';
export { TraceSpanRows } from './runtime/trace-span-rows';
export { TraceGroupRows } from './runtime/trace-group-rows';
export { visibleMetricSeries, parseMetricView, encodeMetricView, type MetricView } from './metrics/metric-view';
export {
  EXPLORE_METRIC_AGGREGATIONS,
  parseMetricAggregation,
  parseMetricStep,
  isMetricQueryName,
  type OptionalExploreField
} from './metrics/metric-fields';
export { compositionSeries, type MetricSourceResult, type MetricComposition } from './metrics/metric-composition';
export { evaluateMetricComposition } from './metrics/metric-evaluation';
export { parseMetricFormula, evaluateMetricFormula } from './metrics/metric-formula';
export {
  parseMetricPlan,
  encodeMetricPlan,
  metricPlanFromQuery,
  nextMetricReference,
  METRIC_ROLLUP_INTERVALS,
  metricTemporalControl,
  metricOutputStep,
  validateMetricPlan,
  type MetricPlan,
  type MetricQueryRow
} from './metrics/metric-plan';
export { type MetricSeries, type MetricResultState, metricNumber, metricPoints } from './metrics/metric-series';
export { splitMetricSeries, metricSplitDomain } from './metrics/metric-split';
export { shiftedMetricWindow, METRIC_TIME_SHIFT_OPTIONS } from './metrics/metric-time-shift';
export {
  traceHistogramSchema,
  traceFacetSchema,
  traceGroupsSchema,
  traceSpanPageSchema,
  type TraceFacetField,
  type TraceHistogram,
  type TraceFacet,
  type TraceGroups,
  type TraceSpanPage,
  type TraceSpanRow,
  type TraceLoad
} from './datasource/hertzbeat-trace-analytics-schema';
export { spanColumnLabel } from './runtime/trace-span-column-label';
export {
  parseTraceView,
  encodeTraceView,
  readTraceView,
  type TraceView,
  DEFAULT_TRACE_VIEW,
  validTraceView
} from './model/hertzbeat-trace-view';
export {
  formatMetricSampleValue,
  buildMetricSampleSnapshot,
  summarizeMetricSeries,
  formatMetricSeriesLabels
} from './metrics/metric-sample-model';
export { metricDisplayData } from './metrics/metric-display-data';
export { metricSourceOutcome } from './datasource/hertzbeat-metric-composition';

export {
  logAnalysisDraftSchema,
  type LogAnalysisState,
  DEFAULT_LOG_ANALYSIS,
  parseLogAnalysis,
  encodeLogAnalysis,
  validLogAnalysis,
  logAnalysisResultSchema,
  type LogAnalysisResult,
  type LogAnalysisGroup
} from './logs/log-analysis';

export {
  LOG_MEASURE_FUNCTIONS,
  type LogMeasure,
  validLogMeasurement,
  sameLogMeasure,
  isLogPercentile,
  logMeasureHintKey
} from './logs/log-measure';

export { type LogGrouping, groupingLimit, groupIdentity } from './logs/log-grouping';

export { LOG_ANALYSIS_INTERVALS, validLogIntervalGrid } from './logs/log-interval';

export { logComparisonSchema, type LogComparison } from './logs/log-comparison';

export {
  type LogComparisonResult,
  type LogComparisonGroup,
  logComparisonResultSchema
} from './logs/log-comparison-result';

export { shiftedLogWindow } from './logs/log-timeshift';

export { normalizeLogBucketValue, isPartialLogBucket } from './logs/log-throughput';
export { formulaOnlyValues } from './logs/log-formula-only';
export { formulaOnlySeries } from './runtime/log-analysis/log-formula-only-series';

export { type ComparisonSource, comparisonValues } from './logs/log-comparison-values';

export { parseLogView, encodeLogView, validLogView, resolveLogRowHeight, type LogView } from './logs/log-view';

export type { HertzBeatLogAnalysisQuery } from './datasource/hertzbeat-query-contract';

export { logAnalysisPath, loadLogAnalysis } from './logs/log-analysis-client';
export { logComparisonRequest, loadLogComparison } from './logs/log-comparison-client';
export { logQuerySetRequest, loadLogQuerySet } from './logs/log-query-set-client';
export {
  addLogFormula,
  addLogSource,
  canMigrateLogQuerySet,
  hasIncompatibleFormulaGrouping,
  migrateLogQuerySet,
  removeLogSource,
  type LogQuerySet,
  type LogQuerySource,
  type LogQueryFormula
} from './logs/log-query-set';
export { LogQuerySetEvidence } from './runtime/log-analysis/log-query-set-evidence';
export type { LogQuerySetResult } from './logs/log-query-set-result';

export type { LogAnalysisEvidence } from './logs/log-analysis-query';

export { logAnalysisGroupLabel, logGroupingFieldLabel } from './runtime/log-analysis/log-grouping-display';
export { formatComparisonTimestamp } from './runtime/log-analysis/log-timeshift-display';
export { formatLogNumericValue } from './runtime/log-analysis/log-throughput-display';

export { type GroupActions, AnalysisGroups } from './runtime/log-analysis/log-analysis-groups';
export { LogMeasureValue, LogAnalysisRankBar } from './runtime/log-analysis/log-measure-value';
export { AdditionalMeasureCells, AdditionalComparisonCells } from './runtime/log-analysis/log-additional-measure-cells';
export { ExploreLogAnalysisTimeseries } from './runtime/log-analysis/log-analysis-timeseries';

export { LogThroughputBucket } from './runtime/log-analysis/log-throughput-bucket';
export { type ComparisonActions, ComparisonTable } from './runtime/log-analysis/log-comparison-table';
export { ExploreLogComparisonTimeseries } from './runtime/log-analysis/log-comparison-timeseries';
export {
  ExploreLogComparisonWindows,
  ExploreLogComparisonFacetWindow
} from './runtime/log-analysis/log-comparison-windows';

export { explorePersesMessages } from './runtime/log-analysis/log-chart-messages';

export { createLogTrendPersesResult as createNativeLogTrendResult } from './runtime/log-analysis/log-chart-adapter';

export { LogAnalysisEvidenceView } from './runtime/log-analysis/log-analysis-evidence-view';

export { metricAxisBoundsValid, metricAxisDataExtent, type MetricAxisDomain } from './metrics/metric-axis-domain';
export { metricAxisScaleValid } from './metrics/metric-axis-scale';
