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
  SavedQueryRecord,
  MetricSignalEvidence,
  LogTrend,
  LogOverview,
  LogStatisticEvidence,
  TraceRow
} from '@/features/explore';
import type { EntitySummary } from '@/features/entity/queries';
import type { TraceHistogram } from '@/platform/perses';
import type {
  RepeatedErrors,
  RepeatedErrorGroup,
  RepeatedErrorRecords,
  RepeatedErrorScope
} from './dashboard-repeated-errors';

type QueryRead<T> = { isFetching: boolean; error: unknown } & (
  { isSuccess: true; isPending: false; data: T } | { isSuccess: false; isPending: boolean; data?: T | undefined }
);
export type DashboardSignals = {
  favoriteState: string;
  clock: { start: number; end: number; hidden: boolean; reducedMotion: boolean; refresh: () => void };
  serviceName: string;
  environment: string;
  setService: (value: string) => void;
  setEnvironment: (value: string) => void;
  options: EntitySummary[];
  catalogState: 'ready' | 'loading' | 'error';
  metric: QueryRead<MetricSignalEvidence> | undefined;
  active: SavedQueryRecord | undefined;
  metricExiting: boolean;
  activeIndex: number;
  metricCount: number;
  metricPaused: boolean;
  setMetricPaused: (value: boolean) => void;
  setMetricInteracting: (value: boolean) => void;
  canRotate: boolean;
  nextMetric: () => void;
  previousMetric: () => void;
  logs: QueryRead<{ overview: LogStatisticEvidence<LogOverview>; trend: LogStatisticEvidence<LogTrend> }>;
  traces: QueryRead<TraceHistogram>;
  traceSamples: QueryRead<{ state: 'ready' | 'unsupported'; rows: TraceRow[] }>;
  metricRemainingMs: number;
  rank: QueryRead<RepeatedErrors>;
  records: QueryRead<RepeatedErrorRecords>;
  rankScope: RepeatedErrorScope;
  selected: RepeatedErrorGroup | null;
  setSelected: (group: RepeatedErrorGroup | null) => void;
  rankPaused: boolean;
  setRankPaused: (value: boolean) => void;
  setRankInteracting: (value: boolean) => void;
  refresh: () => void;
};

export type DashboardTraceSignals = Pick<
  DashboardSignals,
  'clock' | 'traces' | 'traceSamples' | 'serviceName' | 'environment'
>;

export type DashboardRotation = Pick<
  DashboardSignals,
  | 'activeIndex'
  | 'metricCount'
  | 'metricExiting'
  | 'metricRemainingMs'
  | 'metricPaused'
  | 'setMetricPaused'
  | 'setMetricInteracting'
  | 'nextMetric'
  | 'previousMetric'
>;
