/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */
import { useEffect, useRef, useState } from 'react';
import { NavigationType, useLocation, useNavigationType } from 'react-router-dom';

import { mergeExploreQuery, type ExploreQuery, type ExploreQueryPatch } from '../model/explore-model';
import {
  buildSubmissionPatch,
  draftFromQuery,
  type ExploreSubmissionDraft,
  type ExploreSubmissionError
} from '../model/explore-submission-model';

type KeysOfUnion<T> = T extends unknown ? keyof T : never;
type ExploreDraftField = Exclude<KeysOfUnion<ExploreSubmissionDraft>, 'signal'>;

export type ExploreDraftFieldUpdate = {
  [Field in ExploreDraftField]: {
    field: Field;
    value: Field extends 'errorOnly' ? boolean : string;
  }
}[ExploreDraftField];

export type ExploreSubmissionErrors = Partial<Record<ExploreSubmissionError['field'], ExploreSubmissionError['code']>>;

export type ExploreSubmissionController = ReturnType<typeof useExploreSubmission>;

export function useExploreSubmission(
  query: ExploreQuery,
  onSubmitPatch: (patch: ExploreQueryPatch) => void
) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const [draft, setDraft] = useState(() => draftFromQuery(query));
  const [errors, setErrors] = useState<ExploreSubmissionErrors>({});
  const committedDraft = useRef(draftFromQuery(query));
  const previousLocationKey = useRef(location.key);

  useEffect(() => {
    const nextCommitted = draftFromQuery(query);
    const locationChanged = previousLocationKey.current !== location.key;
    const reset = committedDraft.current.signal !== nextCommitted.signal
      || (locationChanged && navigationType === NavigationType.Pop);

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
    const value = field === 'errorOnly' ? false : '';
    setDraft(current => ({ ...current, [field]: value }));
    setErrors(current => withoutErrors(current, [field]));
    onSubmitPatch({ [key]: undefined, pageIndex: undefined });
    return true;
  };

  return { draft, errors, updateField, submit, removeFilter };
}

function changedDraftFields(previous: ExploreSubmissionDraft, next: ExploreSubmissionDraft) {
  if (previous.signal !== next.signal) return Object.keys(next);
  return Object.keys(next).filter(field => (
    previous[field as keyof typeof previous] !== next[field as keyof typeof next]
  ));
}

function mergeCommittedFields(
  current: ExploreSubmissionDraft,
  committed: ExploreSubmissionDraft,
  fields: string[]
) {
  if (current.signal !== committed.signal) return committed;
  return fields.reduce<ExploreSubmissionDraft>((next, field) => ({
    ...next,
    [field]: committed[field as keyof typeof committed]
  }), current);
}

function withoutErrors(errors: ExploreSubmissionErrors, fields: string[]) {
  if (!fields.some(field => field in errors)) return errors;
  return Object.fromEntries(Object.entries(errors).filter(([field]) => !fields.includes(field))) as ExploreSubmissionErrors;
}

function withoutUpdatedFieldErrors(errors: ExploreSubmissionErrors, field: ExploreDraftField) {
  const fields = [field];
  if (
    (field === 'minDurationMs' || field === 'maxDurationMs')
    && errors.maxDurationMs === 'min_exceeds_max'
  ) {
    fields.push('maxDurationMs');
  }
  return withoutErrors(errors, fields);
}

const sharedDraftFields: Partial<Record<keyof ExploreQueryPatch, ExploreDraftField>> = {
  serviceName: 'serviceName',
  environment: 'environment',
  query: 'query'
};

const signalDraftFields: Record<ExploreSubmissionDraft['signal'], Partial<Record<keyof ExploreQueryPatch, ExploreDraftField>>> = {
  metrics: { metricFilter: 'metricFilter', groupBy: 'groupBy', aggregation: 'aggregation', step: 'stepSeconds' },
  logs: {
    severityText: 'severityText', traceId: 'traceId', spanId: 'spanId',
    resourceFilter: 'resourceFilter', attributeFilter: 'attributeFilter'
  },
  traces: {
    traceId: 'traceId', resourceFilter: 'resourceFilter', minDurationMs: 'minDurationMs',
    maxDurationMs: 'maxDurationMs', errorOnly: 'errorOnly'
  }
};

function draftFieldForQueryKey(draft: ExploreSubmissionDraft, key: keyof ExploreQueryPatch) {
  return sharedDraftFields[key] ?? signalDraftFields[draft.signal][key];
}
