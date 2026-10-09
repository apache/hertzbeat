/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { shiftedLogWindow } from '@/platform/perses';
import { logFacetEvidenceWindow } from '../controller/use-log-facets';
import type { useExplorePageController } from '../controller/use-explore-page-controller';
import type { FacetValueAction } from '../components/explore-log-facet-types';
import { readLogAnalysisDraft } from '../model/explore-log-analysis';
import { logComparisonFacetAction } from '../model/explore-log-comparison-facet';
import { logFacetAction } from '../model/explore-log-facet-action';
import { structuredFacetAction } from '../model/explore-log-structured-facet-action';

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

export function facetAction(
  controller: ReturnType<typeof useExplorePageController>,
  enabled: boolean,
  source: 'a' | 'b',
  comparison: boolean
): FacetValueAction {
  const { query, submission } = controller;
  if (comparison)
    return (field, value, operator) => {
      if (submission.draft.signal !== 'logs' || query.signal !== 'logs' || !enabled)
        return { selected: false, disabled: true, onClick: () => {} };
      const update = logComparisonFacetAction(submission.draft, query, source, field, value, operator);
      return {
        selected: false,
        disabled: !update,
        onClick: () => {
          if (update) submission.updateField(update);
        }
      };
    };
  return (field, value, operator, intent = 'toggle') => {
    if (submission.draft.signal !== 'logs' || query.signal !== 'logs' || !enabled)
      return { selected: false, disabled: true, onClick: () => {} };
    const action = logFacetAction(submission.draft, query, field, value, operator, intent);
    const patch = action.patch;
    return {
      selected: action.selected,
      disabled: !action.update && !patch,
      reason: action.reason,
      onClick: () => {
        if (patch) {
          for (const [field, value] of Object.entries(patch))
            submission.updateField({
              field,
              value
            } as import('../model/explore-submission-model').ExploreDraftFieldUpdate);
          submission.submit();
          return;
        }
        if (!action.update) return;
        submission.updateField(action.update);
        submission.submit();
      }
    };
  };
}

export function querySetFacetAction(
  controller: ReturnType<typeof useExplorePageController>,
  enabled: boolean,
  refId: string
): FacetValueAction {
  // eslint-disable-next-line complexity -- maps the shared structured facet action back to one query source.
  return (field, value, operator, intent = 'toggle') => {
    const { query, submission } = controller;
    const draft = submission.draft;
    const draftAnalysis = draft.signal === 'logs' ? readLogAnalysisDraft(draft.logAnalysis) : undefined;
    const source = draftAnalysis?.querySet?.queries.find(item => item.refId === refId);
    if (!enabled || query.signal !== 'logs' || draft.signal !== 'logs' || !draftAnalysis || !source)
      return { selected: false, disabled: true, onClick: () => {} };
    const syntax = source.searchSyntax ?? draft.searchSyntax;
    const text = source.search ?? '';
    if (syntax !== 'structured-v1') return { selected: false, disabled: true, onClick: () => {} };
    const projected = { ...draft, query: text, searchSyntax: syntax };
    const action = structuredFacetAction(projected, query, field, value, operator, intent);
    const search = action.update?.value;
    if (search === undefined)
      return { selected: action.selected, disabled: true, reason: action.reason, onClick: () => {} };
    const update = {
      field: 'logAnalysis' as const,
      value: JSON.stringify({
        ...draftAnalysis,
        querySet: {
          ...draftAnalysis.querySet!,
          queries: draftAnalysis.querySet!.queries.map(item =>
            item.refId === refId ? { ...item, search, searchSyntax: 'structured-v1' as const } : item
          )
        }
      })
    };
    return {
      selected: action.selected,
      disabled: false,
      onClick: () => {
        submission.updateField(update);
        submission.submit();
      }
    };
  };
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
