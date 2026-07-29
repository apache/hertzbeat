/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */
import { useEffect, useRef, useState } from 'react';
import { NavigationType, useLocation, useNavigationType } from 'react-router-dom';

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

export function useExploreSubmission(
  query: ExploreQuery,
  onSubmitPatch: (patch: ExploreQueryPatch) => void
): ExploreSubmissionViewModel {
  const location = useLocation();
  const navigationType = useNavigationType();
  const [draft, setDraft] = useState(() => draftFromQuery(query));
  const [errors, setErrors] = useState<ExploreSubmissionErrors>({});
  const committedDraft = useRef(draftFromQuery(query));
  const previousLocationKey = useRef(location.key);

  useEffect(() => {
    const nextCommitted = draftFromQuery(query);
    const locationChanged = previousLocationKey.current !== location.key;
    const reset =
      committedDraft.current.signal !== nextCommitted.signal ||
      (locationChanged && navigationType === NavigationType.Pop);

    if (reset) {
      setDraft(nextCommitted);
      setErrors({});
    } else {
      const changedFields = changedDraftFields(committedDraft.current, nextCommitted);
      if (changedFields.length) {
        setDraft(current => mergeCommittedFields(current, nextCommitted, changedFields));
        setErrors(current => withoutErrors(current, changedFields));
      }
    }

    committedDraft.current = nextCommitted;
    previousLocationKey.current = location.key;
  }, [location.key, navigationType, query]);

  const updateField = (update: ExploreDraftFieldUpdate) => {
    if (!(update.field in draft)) return;
    setDraft(current => ({ ...current, [update.field]: update.value }));
    setErrors(current => withoutUpdatedFieldErrors(current, update.field));
  };

  const submit = () => {
    const result = buildSubmissionPatch(draft);
    if (!result.valid) {
      setErrors(Object.fromEntries(result.errors.map(error => [error.field, error.code])));
      return;
    }
    setDraft(draftFromQuery(mergeExploreQuery(query, result.patch)));
    setErrors({});
    onSubmitPatch(result.patch);
  };

  const removeFilter = (key: keyof ExploreQueryPatch) => {
    const field = draftFieldForQueryKey(draft, key);
    if (!field) return false;
    const value = isBooleanDraftField(field) ? false : '';
    setDraft(current => ({ ...current, [field]: value }));
    setErrors(current => withoutErrors(current, [field]));
    onSubmitPatch({ [key]: undefined, pageIndex: undefined });
    return true;
  };

  return { draft, errors, updateField, submit, removeFilter };
}

function changedDraftFields(previous: ExploreSubmissionDraft, next: ExploreSubmissionDraft) {
  if (previous.signal !== next.signal) return Object.keys(next);
  return Object.keys(next).filter(
    field => previous[field as keyof typeof previous] !== next[field as keyof typeof next]
  );
}

function mergeCommittedFields(current: ExploreSubmissionDraft, committed: ExploreSubmissionDraft, fields: string[]) {
  if (current.signal !== committed.signal) return committed;
  return fields.reduce<ExploreSubmissionDraft>(
    (next, field) => ({
      ...next,
      [field]: committed[field as keyof typeof committed]
    }),
    current
  );
}

function withoutErrors(errors: ExploreSubmissionErrors, fields: string[]) {
  if (!fields.some(field => field in errors)) return errors;
  return Object.fromEntries(
    Object.entries(errors).filter(([field]) => !fields.includes(field))
  ) as ExploreSubmissionErrors;
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
    severityText: 'severityText',
    traceId: 'traceId',
    spanId: 'spanId',
    resourceFilter: 'resourceFilter',
    attributeFilter: 'attributeFilter',
    hideInternal: 'hideInternal',
    hideNoise: 'hideNoise'
  },
  traces: {
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
