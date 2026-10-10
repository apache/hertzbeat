/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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
  ExploreSignal,
  ExploreTimeRange,
  MetricTemporalAggregation,
  MetricRollupControl,
  TraceSpanScope
} from './explore-query-types';
import type { LogSubqueryContext } from './explore-log-subquery';

export type ExploreQueryPatch = LogSubqueryContext & {
  source?: string | undefined;
  logReferenceJoin?: string | undefined;
  savedView?: string | undefined;
  returnTo?: string | undefined;
  servicesReturnTo?: string | undefined;
  dashboardReturnTo?: string | undefined;
  signal?: ExploreSignal | undefined;
  timeRange?: ExploreTimeRange | undefined;
  entityId?: string | undefined;
  monitorId?: string | undefined;
  serviceName?: string | undefined;
  serviceNamespace?: string | undefined;
  environment?: string | undefined;
  intakeProfileId?: string | undefined;
  collectorId?: string | undefined;
  instance?: string | undefined;
  endpoint?: string | undefined;
  query?: string | undefined;
  windowMode?: 'preset' | undefined;
  autoRefreshMs?: number | undefined;
  start?: number | undefined;
  end?: number | undefined;
  timeZone?: string | undefined;
  traceId?: string | undefined;
  logSort?: string | undefined;
  logRecordUid?: string | undefined;
  logView?: string | undefined;
  logAnalysis?: string | undefined;
  logAggregation?: string | undefined;
  logTransactions?: string | undefined;
  logCalculated?: string | undefined;
  logCalculatedV2?: string | undefined;
  traceReturnTo?: string | undefined;
  traceView?: string | undefined;
  traceStructure?: string | undefined;
  traceStructureView?: 'patterns' | 'flow' | undefined;
  endExclusive?: boolean | undefined;
  errorOnly?: boolean | undefined;
  sort?: string | undefined;
  live?: boolean | undefined;
  logGroupSelection?: string | undefined;
  logNumericRange?: string | undefined;
  searchSyntax?: string | undefined;
  severityText?: string | undefined;
  // Preserve untrusted route text so invalid categories fail validation instead of broadening the query.
  severityCategory?: string | undefined;
  spanId?: string | undefined;
  resourceFilter?: string | undefined;
  attributeFilter?: string | undefined;
  operationName?: string | undefined;
  metricPlan?: string | undefined;
  metricView?: string | undefined;
  metricFilter?: string | undefined;
  groupBy?: string | undefined;
  aggregation?: string | undefined;
  temporalAggregation?: MetricTemporalAggregation | MetricRollupControl | undefined;
  step?: string | undefined;
  minDurationMs?: number | undefined;
  maxDurationMs?: number | undefined;
  spanScope?: TraceSpanScope | undefined;
  hideInternal?: boolean | undefined;
  hideNoise?: boolean | undefined;
  pageIndex?: number | undefined;
};
