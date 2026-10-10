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

import type { ExactTimeWindow } from '@/shared/query-context';
import type { LogInspectorAnalysisControls } from './explore-log-inspector-analysis';
import type { LogInspectorFilterControls } from './explore-log-inspector-filter';
import type { LogSortControls } from './explore-log-order';
import type { LogExploreQuery } from './explore-model';
import type { LogHistoryEvidence } from './explore-signal-contract';

export type ExplorePersesLogPanelProps = LogInspectorFilterControls &
  LogInspectorAnalysisControls & {
    logOrder?: LogSortControls | undefined;
    data: LogHistoryEvidence['page'];
    calculated?: LogHistoryEvidence['calculated'];
    statistics: Pick<LogHistoryEvidence, 'overview' | 'trend'>;
    query: LogExploreQuery;
    openPath: (path: string) => void;
    timeWindow: ExactTimeWindow | undefined;
    revision: number;
    evidenceCurrent: boolean;
    showTrend?: boolean | undefined;
  };
