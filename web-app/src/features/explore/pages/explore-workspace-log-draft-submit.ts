/* Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements. See the NOTICE file distributed with this work for additional information regarding copyright ownership. */
import {
  buildSubmissionPatch,
  type ExploreDraftFieldUpdate,
  type ExploreSubmissionViewModel,
  type LogExploreSubmissionDraft
} from '../model/explore-submission-model';
import type { LogInspectorFilterDraft } from '../model/explore-log-inspector-filter';

export function submitLogDraftPatch(
  submission: ExploreSubmissionViewModel,
  patch: Partial<LogExploreSubmissionDraft> | LogInspectorFilterDraft
) {
  if (
    submission.draft.signal !== 'logs' ||
    !buildSubmissionPatch({ ...submission.draft, ...patch } as LogExploreSubmissionDraft).valid
  )
    return false;
  for (const [field, value] of Object.entries(patch))
    submission.updateField({ field, value } as ExploreDraftFieldUpdate);
  submission.submit();
  return true;
}
