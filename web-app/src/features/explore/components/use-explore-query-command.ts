/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { FormEvent } from 'react';

import type { LogQueryBuilderViewModel } from '../model/explore-log-builder-model';
import type { RecentLogSearchesViewModel } from '../model/explore-recent-log-searches';
import type {
  ExploreDraftFieldUpdate,
  ExploreSubmissionViewModel,
  LogExploreSubmissionDraft
} from '../model/explore-submission-model';
import { useExploreSubmitFocus } from './use-metric-submit-focus';
import { useLogEditorMode } from './explore-log-editor-mode';

export function useExploreQueryCommand({
  submission,
  editor,
  history
}: {
  submission: ExploreSubmissionViewModel;
  editor: LogQueryBuilderViewModel;
  history: RecentLogSearchesViewModel;
}) {
  const { mode, lossless, changeMode } = useLogEditorMode(submission.draft);
  const { queryRef, requestFocus } = useExploreSubmitFocus(submission);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    submission.submit();
    requestFocus();
    history.record(submission.draft);
  };
  return {
    queryRef,
    mode,
    lossless,
    changeMode,
    submit,
    restore: (entry: LogExploreSubmissionDraft) => restoreLogFilters(editor, submission, entry)
  };
}

function restoreLogFilters(
  editor: LogQueryBuilderViewModel,
  submission: ExploreSubmissionViewModel,
  entry: LogExploreSubmissionDraft
) {
  editor.reset();
  Object.entries({
    logGroupSelection: undefined,
    logAnalysis: undefined,
    logSort: undefined,
    logNumericRange: undefined,
    sort: 'newest',
    ...entry
  }).forEach(([field, value]) => {
    if (field !== 'signal' && field !== 'executedAt')
      submission.updateField({ field, value } as ExploreDraftFieldUpdate);
  });
}
