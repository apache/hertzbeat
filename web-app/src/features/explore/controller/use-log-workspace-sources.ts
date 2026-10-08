/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
