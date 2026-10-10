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

import type { ExploreQuery } from '../model/explore-query';
import type { ExplorePageResultState } from '../model/explore-result-model';
import type { LogAnalysisState } from '@/platform/perses';
import { useLogAnalysis } from './use-log-analysis';
import { useLogComparison } from './use-log-comparison';
import { useLogQuerySet } from './use-log-query-set';
export function useLogWorkspaceSources(
  query: ExploreQuery,
  result: ExplorePageResultState,
  applied: LogAnalysisState,
  valid: boolean,
  handoff: string
) {
  const evidence = result.kind === 'refreshing' || result.kind === 'stale_error' ? result.evidence : result;
  const window =
    'window' in evidence && 'signal' in evidence && evidence.signal === 'logs' ? evidence.window : undefined;
  const enabled = valid && handoff !== 'invalid' && ['ready', 'empty', 'refreshing'].includes(result.kind);
  const logs = query as Extract<ExploreQuery, { signal: 'logs' }>;
  const load = useLogAnalysis(
    logs,
    applied,
    window,
    enabled && applied.comparison?.search === undefined && !applied.querySet,
    result.kind === 'refreshing'
  );
  const comparison = useLogComparison(logs, applied, window, enabled, result.kind === 'refreshing');
  const querySet = useLogQuerySet(logs, applied, window, enabled, result.kind === 'refreshing');
  return { window, enabled, load, comparison, querySet };
}
