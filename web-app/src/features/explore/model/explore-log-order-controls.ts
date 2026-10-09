/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { LogSortControls } from './explore-log-order';
import type { ExploreSubmissionViewModel } from './explore-submission-model';
import type { ExploreQuery } from './explore-query';
export function logOrderControls(
  query: ExploreQuery,
  submission: ExploreSubmissionViewModel
): LogSortControls | undefined {
  if (query.signal !== 'logs' || submission.draft.signal !== 'logs') return undefined;
  return {
    draft: query,
    change: (logSort, sort) => {
      submission.applyLogPatch({ logSort, sort });
    }
  };
}
