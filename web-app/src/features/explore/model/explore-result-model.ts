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

import type { ExplorePageResult, LogRow, MetricConsole, TraceRow } from './explore-signal-contract';
import type { MetricResultState } from './explore-signal-model';

export type HistoricalEvidence =
  | { signal: 'metrics'; data: MetricConsole }
  | { signal: 'logs'; data: ExplorePageResult<LogRow> }
  | { signal: 'traces'; data: ExplorePageResult<TraceRow> };

export type ExploreFailureKind = 'permission' | 'transport_error' | 'contract_error' | 'error';

type ExploreFailureResultState = {
  [Kind in ExploreFailureKind]: { kind: Kind };
}[ExploreFailureKind];

export type ExploreCurrentResultState =
  | { kind: 'metric'; state: MetricResultState; data: MetricConsole }
  | { kind: 'empty' | 'ready'; signal: 'logs'; data: ExplorePageResult<LogRow> }
  | { kind: 'empty' | 'ready'; signal: 'traces'; data: ExplorePageResult<TraceRow> };

export type ExplorePageResultState =
  | { kind: 'invalid' }
  | { kind: 'live' }
  | { kind: 'loading' }
  | ExploreFailureResultState
  | ExploreCurrentResultState
  | { kind: 'refreshing'; evidence: ExploreCurrentResultState }
  | { kind: 'stale_error'; errorKind: ExploreFailureKind; evidence: ExploreCurrentResultState };
