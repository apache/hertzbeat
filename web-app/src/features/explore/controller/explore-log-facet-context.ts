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

import { shiftedLogWindow } from '@/platform/perses';
import { logFacetEvidenceWindow } from './use-log-facets';
import type { useExplorePageController } from './use-explore-page-controller';
import { readLogAnalysisDraft } from '../model/explore-log-analysis';

// eslint-disable-next-line complexity -- comparison and query-set targets share one evidence context.
export function comparisonFacetContext(controller: ReturnType<typeof useExplorePageController>, target: string) {
  const appliedQuerySet =
    controller.query.signal === 'logs' ? readLogAnalysisDraft(controller.query.logAnalysis)?.querySet : undefined;
  const draftQuerySet =
    controller.submission.draft.signal === 'logs'
      ? readLogAnalysisDraft(controller.submission.draft.logAnalysis)?.querySet
      : undefined;
  if (appliedQuerySet || draftQuerySet) {
    const availableTargets = draftQuerySet?.queries ?? appliedQuerySet?.queries ?? [];
    const selected = availableTargets.some(source => source.refId === target)
      ? target
      : (availableTargets[0]?.refId ?? 'a');
    const applied = appliedQuerySet?.queries.find(source => source.refId === selected);
    const drafted = draftQuerySet?.queries.find(source => source.refId === selected);
    const baseWindow = logFacetEvidenceWindow(controller.query, controller.result);
    const window = applied && baseWindow ? shiftedLogWindow(baseWindow, applied.timeShiftMs ?? undefined) : undefined;
    const facetSyntax =
      applied?.searchSyntax ?? (controller.query.signal === 'logs' ? controller.query.searchSyntax : undefined);
    const facetQuery =
      controller.query.signal === 'logs' && applied && window
        ? {
            ...controller.query,
            query: applied.search ?? '',
            searchSyntax: facetSyntax,
            start: window.from,
            end: window.to,
            windowMode: undefined
          }
        : controller.query;
    return {
      current: undefined,
      source: selected,
      facetQuery,
      window,
      targets: availableTargets.map(source => ({ value: source.refId, label: source.alias })),
      targetSyntax: facetSyntax,
      querySet: true,
      appliedQuerySet,
      draftQuerySet,
      appliedSource: applied,
      draftSource: drafted
    };
  }
  const applied = fieldsComparison(controller.query);
  const current = fieldsComparison(controller.submission.draft);
  const source: 'a' | 'b' = current && target === 'b' ? 'b' : 'a';
  const window = comparisonFacetWindow(controller, source, applied?.timeShiftMs, Boolean(applied));
  const facetQuery =
    controller.query.signal === 'logs' && source === 'b' && applied && window
      ? {
          ...controller.query,
          query: applied.search,
          searchSyntax: applied.searchSyntax,
          start: window.from,
          end: window.to,
          windowMode: undefined
        }
      : controller.query;
  return { current, source, facetQuery, window, targets: undefined, targetSyntax: undefined, querySet: false };
}

export function nextQuerySetTarget(sourceIds: string[], previousSourceIds: string[], selected: string) {
  if (!sourceIds.length) return selected;
  const added = sourceIds.filter(sourceId => !previousSourceIds.includes(sourceId));
  if (added.length) return added[added.length - 1]!;
  return sourceIds.includes(selected) ? selected : sourceIds[0]!;
}

export function querySetTimelineContext(controller: ReturnType<typeof useExplorePageController>, target: string) {
  const context = comparisonFacetContext(controller, target);
  const source = context.appliedSource;
  const window = context.window;
  const query =
    controller.query.signal === 'logs' && context.facetQuery.signal === 'logs' && source && window
      ? {
          ...context.facetQuery,
          logAnalysis: undefined,
          logCalculated: undefined,
          logCalculatedV2: undefined,
          logSubquery: undefined,
          logTransactions: undefined,
          logAggregation: undefined,
          query: source.search ?? '',
          searchSyntax: source.searchSyntax ?? controller.query.searchSyntax,
          start: window.from,
          end: window.to,
          windowMode: undefined
        }
      : undefined;
  return { ...context, query };
}

function comparisonFacetWindow(
  controller: ReturnType<typeof useExplorePageController>,
  source: 'a' | 'b',
  shift: number | undefined,
  hasApplied: boolean
) {
  const window = logFacetEvidenceWindow(controller.query, controller.result);
  if (source === 'a') return window;
  return hasApplied && window ? shiftedLogWindow(window, shift) : undefined;
}

function fieldsComparison(value: {
  signal: string;
  logAggregation?: string | undefined;
  logAnalysis?: string | undefined;
}) {
  if (value.signal !== 'logs' || value.logAggregation === 'transactions') return undefined;
  const comparison = readLogAnalysisDraft(value.logAnalysis)?.comparison;
  return comparison?.search === undefined ? undefined : comparison;
}
