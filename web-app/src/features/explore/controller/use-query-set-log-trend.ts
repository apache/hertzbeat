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

import { useState } from 'react';
import type { useExplorePageController } from './use-explore-page-controller';
import { comparisonFacetContext, nextQuerySetTarget, querySetTimelineContext } from './explore-log-facet-context';
import { facetRequestsEnabled, logFacetEvidenceWindow } from './use-log-facets';
import { useLogSourceTrend } from './use-log-source-trend';
import { buildExplorePath, logTrendZoomPatch, mergeExploreQuery, type LogExploreQuery } from '../model/explore-model';
import type { ExactTimeWindow } from '@/shared/query-context';

export function useQuerySetLogTrend(controller: ReturnType<typeof useExplorePageController>, query: LogExploreQuery) {
  const [selection, setSelection] = useState<{ refs: string[]; ref: string }>({ refs: [], ref: 'a' });
  const first = comparisonFacetContext(controller, selection.ref);
  const refs = first.targets?.map(target => target.value) ?? [];
  const target = nextQuerySetTarget(refs, selection.refs, selection.ref);
  if (refs.join(',') !== selection.refs.join(',') || selection.ref !== target) setSelection({ refs, ref: target });
  const context = querySetTimelineContext(controller, target);
  const source = context.appliedSource;
  const window = context.window;
  const projected = context.query;
  const active = Boolean(
    source && context.draftSource && window && projected && facetRequestsEnabled(query, controller.result, window)
  );
  const sourcePending = Boolean(context.draftSource && !source);
  const refreshRevision = trendRefreshRevision(controller.result);
  const trend = useLogSourceTrend({ query, projected, window, refreshRevision, active });
  const onTimeWindowChange = (next: ExactTimeWindow) => {
    if (controller.result.kind !== 'ready' && controller.result.kind !== 'empty') return;
    if (trend.isFetching) return;
    const shift = source?.timeShiftMs ?? 0;
    const baseWindow = logFacetEvidenceWindow(query, controller.result);
    if (!baseWindow) return;
    const mapped = { from: next.from + shift, to: next.to + shift };
    const patch = logTrendZoomPatch(query, baseWindow, mapped);
    if (patch) controller.openPath(buildExplorePath(mergeExploreQuery(query, patch)));
  };
  return {
    refs,
    target,
    window,
    projected,
    active,
    sourcePending,
    trend,
    onTimeWindowChange,
    onTarget: (ref: string) => setSelection({ refs, ref })
  };
}

function trendRefreshRevision(result: ReturnType<typeof useExplorePageController>['result']) {
  return result.kind === 'refreshing' || result.kind === 'stale_error'
    ? result.evidence.revision
    : result.kind === 'ready' || result.kind === 'empty'
      ? result.revision
      : 0;
}
