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

import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { NavigationType, useLocation, useNavigationType } from 'react-router-dom';
import type { ExploreQuery } from '../model/explore-model';
import {
  draftFromQuery,
  type ExploreSubmissionDraft,
  type ExploreSubmissionErrors
} from '../model/explore-submission-model';

export function useExploreDraftSync(
  query: ExploreQuery,
  currentDraft: MutableRefObject<ExploreSubmissionDraft>,
  publishDraft: (next: ExploreSubmissionDraft) => void,
  setErrors: Dispatch<SetStateAction<ExploreSubmissionErrors>>
) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const committedDraft = useRef(draftFromQuery(query));
  const previousLocationKey = useRef(location.key);
  const preserveSearchRef = useRef<('query' | 'searchSyntax')[]>([]);
  useEffect(() => {
    const nextCommitted = draftFromQuery(query);
    const locationChanged = previousLocationKey.current !== location.key;
    const reset =
      committedDraft.current.signal !== nextCommitted.signal ||
      committedDraft.current.source !== nextCommitted.source ||
      (locationChanged && (navigationType === NavigationType.Pop || isQueryReplacement(location.state)));
    if (reset) {
      publishDraft(nextCommitted);
      setErrors({});
    } else {
      const changedFields = changedDraftFields(committedDraft.current, nextCommitted).filter(
        field => !preserveSearchRef.current.includes(field as 'query' | 'searchSyntax')
      );
      if (changedFields.length) {
        publishDraft(mergeCommittedFields(currentDraft.current, nextCommitted, changedFields));
        setErrors(current => withoutErrors(current, changedFields));
      }
    }
    preserveSearchRef.current = [];
    committedDraft.current = nextCommitted;
    previousLocationKey.current = location.key;
  }, [location.key, location.state, navigationType, query, publishDraft, currentDraft, setErrors]);
  return { committedDraft, preserveSearchRef };
}

function isQueryReplacement(state: unknown) {
  return (
    state != null && typeof state === 'object' && 'replaceExploreQuery' in state && state.replaceExploreQuery === true
  );
}

export function changedDraftFields(previous: ExploreSubmissionDraft, next: ExploreSubmissionDraft) {
  if (previous.signal !== next.signal) return Object.keys(next);
  return Object.keys(next).filter(
    field => previous[field as keyof typeof previous] !== next[field as keyof typeof next]
  );
}

export function mergeCommittedFields(
  current: ExploreSubmissionDraft,
  committed: ExploreSubmissionDraft,
  fields: string[]
) {
  if (current.signal !== committed.signal) return committed;
  return fields.reduce<ExploreSubmissionDraft>(
    (next, field) => ({
      ...next,
      [field]: committed[field as keyof typeof committed]
    }),
    current
  );
}

export function withoutErrors(errors: ExploreSubmissionErrors, fields: string[]) {
  if (!fields.some(field => field in errors)) return errors;
  return Object.fromEntries(
    Object.entries(errors).filter(([field]) => !fields.includes(field))
  ) as ExploreSubmissionErrors;
}
