import type { useLogAnalysis } from './use-log-analysis';
import { type LogAnalysisGroup, type LogAnalysisState, type LogComparisonGroup } from '@/platform/perses';
import { logAnalysisDrilldownPath } from '../model/explore-log-analysis-navigation';
/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { ExactTimeWindow } from '@/shared/query-context';
import type { useExplorePageController } from './use-explore-page-controller';
import type { useLogComparison } from './use-log-comparison';

import { draftFromQuery } from '../model/explore-submission-model';
import { logComparisonDrilldownPath } from '../model/explore-log-comparison-navigation';
export function comparisonNavigation(
  controller: ReturnType<typeof useExplorePageController>,
  load: ReturnType<typeof useLogComparison>,
  analysis: LogAnalysisState,
  window: ExactTimeWindow | undefined
) {
  if (
    controller.result.kind !== 'ready' ||
    load.state !== 'ready' ||
    JSON.stringify(controller.submission.draft) !== JSON.stringify(draftFromQuery(controller.query))
  )
    return {};
  const path = (group: LogComparisonGroup, source: 'a' | 'b') =>
    controller.query.signal === 'logs' && window
      ? logComparisonDrilldownPath(controller.query, window, analysis, group, source)
      : undefined;
  return {
    canOpenGroup: (group: LogComparisonGroup, source: 'a' | 'b') => Boolean(path(group, source)),
    onGroup: (group: LogComparisonGroup, source: 'a' | 'b') => {
      const next = path(group, source);
      if (next) controller.openPath(next);
    },
    onTimeWindowChange: (selected: ExactTimeWindow) => {
      if (
        window &&
        Number.isSafeInteger(selected.from) &&
        Number.isSafeInteger(selected.to) &&
        selected.from >= window.from &&
        selected.to <= window.to &&
        selected.from < selected.to
      )
        controller.updateQuery({
          start: selected.from,
          end: selected.to,
          windowMode: undefined,
          pageIndex: undefined,
          autoRefreshMs: undefined
        });
    }
  };
}

export function analysisNavigation(
  controller: ReturnType<typeof useExplorePageController>,
  load: ReturnType<typeof useLogAnalysis>,
  window: ExactTimeWindow | undefined
) {
  const current =
    controller.result.kind === 'ready' &&
    JSON.stringify(controller.submission.draft) === JSON.stringify(draftFromQuery(controller.query));
  if (!current) return {};
  const path = (group: LogAnalysisGroup) =>
    controller.query.signal === 'logs' && window && load.state === 'ready' && load.data
      ? logAnalysisDrilldownPath(controller.query, window, load.data.field, group)
      : undefined;
  return {
    onTimeWindowChange: (selected: ExactTimeWindow) => {
      if (
        window &&
        load.state === 'ready' &&
        Number.isSafeInteger(selected.from) &&
        Number.isSafeInteger(selected.to) &&
        selected.from >= window.from &&
        selected.to <= window.to &&
        selected.from < selected.to
      )
        controller.updateQuery({
          start: selected.from,
          end: selected.to,
          windowMode: undefined,
          pageIndex: undefined,
          autoRefreshMs: undefined
        });
    },
    canOpenGroup: (group: LogAnalysisGroup) => Boolean(path(group)),
    onGroup: (group: LogAnalysisGroup) => {
      const next = path(group);
      if (next) controller.openPath(next);
    }
  };
}
