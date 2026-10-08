/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { ExploreQuery, ExploreSignal } from './explore-query';
import { mergeExploreQuery } from './explore-model';
import { buildSubmissionPatch, draftFromQuery, type ExploreSubmissionDraft } from './explore-submission-model';
import type { SavedQueryRecord } from './explore-saved-query-model';
import type { SavedViewDirectoryPreferences, SavedViewSort } from './explore-saved-view-directory';

export type SavedQueryGroup = {
  signal: ExploreSignal;
  state: 'loading' | 'ready' | 'error' | 'permission' | 'contract_error' | 'transport_error';
  records: SavedQueryRecord[];
};
export type SavedQueryEditor = {
  mode: 'create' | 'update' | 'copy';
  revision?: number | null | undefined;
  viewKey: string;
  label: string;
  description: string;
};
export type SavedQueriesViewModel = {
  open: boolean;
  groups: SavedQueryGroup[];
  active: SavedQueryRecord | undefined;
  activeUnavailable: boolean;
  activeLoading: boolean;
  activeChanged?: boolean;
  dirty: boolean;
  canWrite: boolean;
  saveBlocked: boolean;
  sourcePending?: boolean;
  busy: boolean;
  error: string | undefined;
  editor: SavedQueryEditor | undefined;
  query: ExploreQuery;
  username?: string;
  setOpen: (open: boolean) => void;
  refresh: () => void;
  begin: (mode: SavedQueryEditor['mode']) => void;
  closeEditor: () => void;
  edit: (field: 'label' | 'description', value: string) => void;
  save: () => Promise<void>;
  updateActive?: () => Promise<void>;
  remove: (record: SavedQueryRecord) => Promise<void>;
  reopen: (record: SavedQueryRecord, discard?: boolean) => void;
  reopenDefault?: (discard?: boolean) => void;
  directoryPreferences?: SavedViewDirectoryPreferences;
  setDirectorySort?: (sort: SavedViewSort) => void;
  setOnlyMine?: (onlyMine: boolean) => void;
  toggleFavorite?: (viewKey: string) => void;
};

export function pendingSavedViewChanges(model: SavedQueriesViewModel) {
  return model.dirty || Boolean(model.activeChanged) || Boolean(model.editor);
}

export function hasUnappliedExploreDraft(query: ExploreQuery, draft: ExploreSubmissionDraft) {
  const submitted = buildSubmissionPatch(draft);
  const committed = buildSubmissionPatch(draftFromQuery(query));
  return (
    !submitted.valid ||
    !committed.valid ||
    JSON.stringify(draftFromQuery(mergeExploreQuery(query, submitted.patch))) !==
      JSON.stringify(draftFromQuery(mergeExploreQuery(query, committed.patch)))
  );
}

export function savedQueryWindowLabel(query: ExploreQuery) {
  if (query.start == null || query.end == null) return '';
  const timeZone = query.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium', timeZone }).formatRange(
    new Date(query.start),
    new Date(query.end)
  );
}
