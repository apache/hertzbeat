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

import type { LogFilterFailureReason } from './explore-log-filter-failure';
import type {
  TracePageResult,
  LogHistoryEvidence,
  MetricConsole,
  MetricSignalEvidence
} from './explore-signal-contract';
import type { MetricResultState } from './explore-signal-model';
import type { ExactTimeWindow } from '@/shared/query-context';

type EvidenceOwner = { window: ExactTimeWindow; revision: number };

export type HistoricalEvidence =
  | (EvidenceOwner & { signal: 'metrics'; data: MetricSignalEvidence })
  | (EvidenceOwner & { signal: 'logs'; data: LogHistoryEvidence })
  | (EvidenceOwner & { signal: 'traces'; data: TracePageResult });

export type ExploreFailureKind =
  | 'permission'
  | 'transport_error'
  | 'contract_error'
  | 'invalid_query'
  | 'invalid_filter'
  | 'calculated_budget_exceeded'
  | 'calculated_invalid_pattern'
  | 'error';

type ExploreFailureResultState = {
  [Kind in ExploreFailureKind]: {
    kind: Kind;
    invalidFilterReason?: LogFilterFailureReason | undefined;
    syntaxDiagnostic?: import('./explore-log-filter-failure').LogSyntaxDiagnostic | undefined;
  };
}[ExploreFailureKind];

export type ExploreCurrentResultState = EvidenceOwner &
  (
    | { kind: 'metric'; state: MetricResultState; data?: MetricConsole | undefined }
    | {
        kind: 'empty' | 'ready';
        signal: 'logs';
        data: LogHistoryEvidence['page'];
        statistics: Pick<LogHistoryEvidence, 'overview' | 'trend'>;
        calculated?: LogHistoryEvidence['calculated'];
      }
    | { kind: 'empty' | 'ready'; signal: 'traces'; data: TracePageResult }
  );

export type ExplorePageResultState =
  | { kind: 'invalid' }
  | { kind: 'live' }
  | { kind: 'loading' }
  | ExploreFailureResultState
  | ExploreCurrentResultState
  | { kind: 'refreshing'; evidence: ExploreCurrentResultState }
  | {
      kind: 'stale_error';
      errorKind: ExploreFailureKind;
      invalidFilterReason?: LogFilterFailureReason | undefined;
      syntaxDiagnostic?: import('./explore-log-filter-failure').LogSyntaxDiagnostic | undefined;
      evidence: ExploreCurrentResultState;
    };

export function hasMetricQueryEvidence(result: ExplorePageResultState) {
  const evidence = result.kind === 'refreshing' || result.kind === 'stale_error' ? result.evidence : result;
  return (
    evidence.kind === 'metric' &&
    Boolean(evidence.data) &&
    (evidence.state.kind === 'ready' || evidence.state.kind === 'empty')
  );
}
