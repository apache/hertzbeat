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

import type { ReactNode } from 'react';
import type { HertzBeatLogsTableResult } from '@/platform/perses';
import type { ExactTimeWindow } from '@/shared/query-context';
import type { LogInspectorAnalysisControls } from '../model/explore-log-inspector-analysis';
import type { LogSortControls } from '../model/explore-log-order';
import type { LogColumnControls } from '../model/explore-log-columns';
import type { LogInspectorFilterControls } from '../model/explore-log-inspector-filter';
import type { createExploreLogPersesResult } from '../model/explore-perses-result-model';
import type { LogExploreQuery } from '../model/explore-model';
import type { LogRow, LogHistoryEvidence, CalculatedPageResponse } from '../model/explore-signal-contract';

export type SelectionProps = LogInspectorFilterControls &
  LogInspectorAnalysisControls & {
    logOrder?: LogSortControls | undefined;
    selectionReset?: number | undefined;
    onSelectionChange?: (() => void) | undefined;
    renderLogContext?: ((row: LogRow) => ReactNode) | undefined;
    logColumns?: LogColumnControls | undefined;
    rows: LogRow[];
    page?: LogHistoryEvidence['page'] | undefined;
    calculated?: CalculatedPageResponse | undefined;
    query: LogExploreQuery;
    timeWindow: ExactTimeWindow;
    runtimeIdentity: string;
    persesQuery: ReturnType<typeof createExploreLogPersesResult>['query'];
    persesOutcome: ReturnType<typeof createExploreLogPersesResult>['outcome'];
    logDisplay: Parameters<typeof HertzBeatLogsTableResult>[0]['logDisplay'];
    evidenceCurrent: boolean;
    openPath: (path: string) => void;
  };
