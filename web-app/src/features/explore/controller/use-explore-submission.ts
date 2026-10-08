/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */
import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { QUERY_CONTEXT_FIELDS } from '@/shared/query-context';

import { mergeExploreQuery, type ExploreQuery, type ExploreQueryPatch } from '../model/explore-model';
import {
  buildSubmissionPatch,
  draftFromQuery,
  type ExploreDraftField,
  type ExploreDraftFieldUpdate,
  type ExploreSubmissionDraft,
  type ExploreSubmissionErrors,
  type ExploreSubmissionViewModel
} from '../model/explore-submission-model';
import { changedDraftFields, mergeCommittedFields, useExploreDraftSync, withoutErrors } from './use-explore-draft-sync';

export function useExploreSubmission(
  query: ExploreQuery,
  onSubmitPatch: (patch: ExploreQueryPatch) => void
): ExploreSubmissionViewModel {
  const [draft, setDraft] = useState(() => draftFromQuery(query));
  const currentDraft = useRef(draft);
  const publishDraft = useCallback((next: ExploreSubmissionDraft) => {
    currentDraft.current = next;
    setDraft(next);
  }, []);
  const [errors, setErrors] = useState<ExploreSubmissionErrors>({});
  const { committedDraft, preserveSearchRef } = useExploreDraftSync(query, currentDraft, publishDraft, setErrors);

  const updateField = (update: ExploreDraftFieldUpdate) => {
    if (!(update.field in draft)) return;
    publishDraft({ ...currentDraft.current, [update.field]: update.value });
    setErrors(current => withoutUpdatedFieldErrors(current, update.field));
  };

  const submit = () => {
    const result = buildSubmissionPatch(currentDraft.current);
    if (!result.valid) {
      setErrors(Object.fromEntries(result.errors.map(error => [error.field, error.code])));
      return;
    }
    publishDraft(draftFromQuery(mergeExploreQuery(query, result.patch)));
    setErrors({});
    onSubmitPatch(result.patch);
  };

  const applyLogPatch = (patch: ExploreQueryPatch) => {
    const draft = currentDraft.current;
    const committed = committedDraft.current;
    if (query.signal !== 'logs' || draft.signal !== 'logs' || committed.signal !== 'logs') return false;
    const next = draftFromQuery(mergeExploreQuery(query, patch));
    if (next.signal !== 'logs') return false;
    const result = buildSubmissionPatch(next);
    if (!result.valid) {
      setErrors(Object.fromEntries(result.errors.map(error => [error.field, error.code])));
      return false;
    }
    preserveSearchRef.current = (['query', 'searchSyntax'] as const).filter(
      field => draft[field] !== committed[field] && next[field] !== committed[field]
    );
    const changedFields = scopedDraftFields(draft, committed, next, patch, preserveSearchRef.current);
    if (changedFields.length) publishDraft(mergeCommittedFields(draft, next, changedFields));
    setErrors({});
    onSubmitPatch({ ...patch, pageIndex: undefined });
    return true;
  };

  const removeFilters = (keys: readonly (keyof ExploreQueryPatch)[]) =>
    removeSubmissionFilters(keys, currentDraft.current, publishDraft, setErrors, onSubmitPatch);
  const removeFilter = (key: keyof ExploreQueryPatch) =>
    Boolean(draftFieldForQueryKey(draft, key)) && removeFilters([key]);

  const resetDraft = () => {
    publishDraft(draftFromQuery(query));
    setErrors({});
  };
  return { draft, errors, updateField, submit, applyLogPatch, resetDraft, removeFilter, removeFilters };
}

function scopedDraftFields(
  draft: ExploreSubmissionDraft,
  committed: ExploreSubmissionDraft,
  next: ExploreSubmissionDraft,
  patch: ExploreQueryPatch,
  preserved: readonly string[]
) {
  const explicit = Object.keys(patch).flatMap(key => {
    const field = draftFieldForQueryKey(draft, key as keyof ExploreQueryPatch);
    return field ? [field] : [];
  });
  return [...new Set([...changedDraftFields(committed, next), ...explicit])].filter(
    field => !preserved.includes(field)
  );
}

function removeSubmissionFilters(
  keys: readonly (keyof ExploreQueryPatch)[],
  draft: ExploreSubmissionDraft,
  publishDraft: (next: ExploreSubmissionDraft) => void,
  setErrors: Dispatch<SetStateAction<ExploreSubmissionErrors>>,
  onSubmitPatch: (patch: ExploreQueryPatch) => void
) {
  if (!keys.length) return false;
  const fields = keys.flatMap(key => {
    const field = draftFieldForQueryKey(draft, key);
    return field ? [field] : [];
  });
  publishDraft(
    fields.reduce(
      (next, field) => ({
        ...next,
        [field]:
          field === 'logGroupSelection' || field === 'logSort' || field === 'logNumericRange'
            ? undefined
            : isBooleanDraftField(field)
              ? false
              : ''
      }),
      draft
    )
  );
  setErrors(current => withoutErrors(current, fields));
  onSubmitPatch({ ...Object.fromEntries(keys.map(key => [key, undefined])), pageIndex: undefined });
  return true;
}

function withoutUpdatedFieldErrors(errors: ExploreSubmissionErrors, field: ExploreDraftField) {
  const fields = [field];
  if ((field === 'minDurationMs' || field === 'maxDurationMs') && errors.maxDurationMs === 'min_exceeds_max') {
    fields.push('maxDurationMs');
  }
  return withoutErrors(errors, fields);
}

const sharedDraftFields: Partial<Record<keyof ExploreQueryPatch, ExploreDraftField>> = {
  serviceName: 'serviceName',
  serviceNamespace: 'serviceNamespace',
  environment: 'environment',
  [QUERY_CONTEXT_FIELDS.instance]: QUERY_CONTEXT_FIELDS.instance,
  [QUERY_CONTEXT_FIELDS.endpoint]: QUERY_CONTEXT_FIELDS.endpoint,
  query: 'query'
};

const signalDraftFields: Record<
  ExploreSubmissionDraft['signal'],
  Partial<Record<keyof ExploreQueryPatch, ExploreDraftField>>
> = {
  metrics: {
    metricFilter: 'metricFilter',
    groupBy: 'groupBy',
    aggregation: 'aggregation',
    temporalAggregation: 'temporalAggregation',
    step: 'stepSeconds'
  },
  logs: {
    sort: 'sort',
    logSort: 'logSort',
    logAnalysis: 'logAnalysis',
    logCalculatedV2: 'logCalculatedV2',
    searchSyntax: 'searchSyntax',
    logGroupSelection: 'logGroupSelection',
    logNumericRange: 'logNumericRange',
    severityText: 'severityText',
    severityCategory: 'severityCategory',
    traceId: 'traceId',
    spanId: 'spanId',
    resourceFilter: 'resourceFilter',
    attributeFilter: 'attributeFilter',
    hideInternal: 'hideInternal',
    hideNoise: 'hideNoise'
  },
  traces: {
    traceStructure: 'traceStructure',
    attributeFilter: 'attributeFilter',
    sort: 'sort',
    traceId: 'traceId',
    resourceFilter: 'resourceFilter',
    minDurationMs: 'minDurationMs',
    maxDurationMs: 'maxDurationMs',
    errorOnly: 'errorOnly',
    spanScope: 'spanScope',
    hideInternal: 'hideInternal'
  }
};

function draftFieldForQueryKey(draft: ExploreSubmissionDraft, key: keyof ExploreQueryPatch) {
  return sharedDraftFields[key] ?? signalDraftFields[draft.signal][key];
}

function isBooleanDraftField(field: ExploreDraftField) {
  return field === 'errorOnly' || field === 'hideInternal' || field === 'hideNoise';
}
