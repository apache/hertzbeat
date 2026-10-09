/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useSession } from '@/core/auth/session-context';

import { buildExplorePath, type ExploreQuery } from '../model/explore-model';
import {
  readSavedQuery,
  buildSavedQueryPayload,
  isSavedViewReference,
  savedQueryConditions,
  type SavedQueryRecord
} from '../model/explore-saved-query-model';
import { hasUnappliedExploreDraft, type SavedQueriesViewModel } from '../model/explore-saved-query-view-model';
import type { ExploreSubmissionDraft } from '../model/explore-submission-model';
import { hasUnsupportedLegacyLogAnalysis } from '../model/explore-log-analysis';
import { useSavedQueryCatalog } from './use-saved-query-catalog';
import { useSavedQueryEditor } from './use-saved-query-editor';
import { useSavedViewDirectoryPreferences } from './use-saved-view-directory-preferences';
import { switchSavedQuery, switchDefaultView, selectSavedView, setSavedQueriesOpen } from './saved-query-switches';

export function useExploreSavedQueries(
  query: ExploreQuery,
  draft: ExploreSubmissionDraft,
  sourceReady = true
): SavedQueriesViewModel {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useSession();
  const canWrite = hasSavedViewWriteRole(session?.roles);
  const open = location.hash === '#saved-queries';
  const catalog = useSavedQueryCatalog(open || Boolean(query.savedView));
  const directoryRecords = catalog.groups.flatMap(item => item.records);
  const catalogReady = catalog.groups.every(item => item.state === 'ready');
  const group = catalog.groups.find(item => item.signal === query.signal)!;
  const active = findActiveRecord(group.state, group.records, query.savedView);
  const directory = useSavedViewDirectoryPreferences(
    session ?? {},
    directoryRecords,
    catalogReady,
    readyRecordKey(active)
  );
  useSavedViewReference(active, location.search, navigate);
  const activeUnavailable = Boolean(query.savedView) && (!active || readSavedQuery(active).kind !== 'ready');
  const activeLoading = Boolean(query.savedView) && group.state === 'loading';
  const dirty = hasUnappliedExploreDraft(query, draft);
  const activeChanged = savedViewChanged(active, query);
  const saveBlocked = cannotSave(query, draft, sourceReady, dirty, activeUnavailable);
  const selected = (savedView: string | undefined) => selectSavedView(savedView, query, open, navigate);
  const editor = useSavedQueryEditor({
    source: `${location.pathname}${location.search}`,
    query,
    active,
    canWrite,
    saveBlocked,
    refresh: catalog.refresh,
    selected
  });
  const switchContext = {
    query,
    open,
    busy: editor.busy,
    editing: Boolean(editor.editor),
    dirty,
    activeChanged,
    discard: false,
    navigate
  };
  const reopen = (record: SavedQueryRecord, discard = false) =>
    reopenSavedView(record, discard, switchContext, directory);
  const reopenDefault = (discard = false) => switchDefaultView({ ...switchContext, discard });
  return {
    ...catalog,
    ...editor,
    open,
    active,
    activeUnavailable,
    activeLoading,
    activeChanged,
    dirty,
    canWrite,
    saveBlocked,
    sourcePending: !sourceReady,
    query,
    ...(session?.username ? { username: session.username } : {}),
    reopen,
    reopenDefault,
    directoryPreferences: directory.preferences,
    setDirectorySort: directory.setSort,
    setOnlyMine: directory.setOnlyMine,
    toggleFavorite: directory.toggleFavorite,
    setOpen: (visible: boolean) => openSavedViewDirectory(visible, active, directory, location, navigate)
  };
}

function hasSavedViewWriteRole(roles: string[] | undefined) {
  return roles?.some(role => role === 'ADMIN' || role === 'USER') ?? false;
}

function findActiveRecord(state: string, records: SavedQueryRecord[], viewKey: string | undefined) {
  return state === 'ready' ? records.find(item => item.viewKey === viewKey) : undefined;
}

function readyRecordKey(record: SavedQueryRecord | undefined) {
  return record && readSavedQuery(record).kind === 'ready' ? record.viewKey : undefined;
}

function reopenSavedView(
  record: SavedQueryRecord,
  discard: boolean,
  context: Parameters<typeof switchSavedQuery>[1],
  directory: ReturnType<typeof useSavedViewDirectoryPreferences>
) {
  if (switchSavedQuery(record, { ...context, discard })) directory.recordOpen(record.viewKey);
}

function openSavedViewDirectory(
  visible: boolean,
  active: SavedQueryRecord | undefined,
  directory: ReturnType<typeof useSavedViewDirectoryPreferences>,
  location: ReturnType<typeof useLocation>,
  navigate: ReturnType<typeof useNavigate>
) {
  if (visible && active) directory.recordOpen(active.viewKey);
  setSavedQueriesOpen(visible, location, navigate);
}

function savedViewChanged(active: SavedQueryRecord | undefined, query: ExploreQuery) {
  if (!active) return false;
  const restored = readSavedQuery(active);
  return (
    restored.kind === 'ready' &&
    buildExplorePath(savedQueryConditions(query)) !== buildExplorePath(savedQueryConditions(restored.query))
  );
}

function cannotSave(
  query: ExploreQuery,
  draft: ExploreSubmissionDraft,
  sourceReady: boolean,
  dirty: boolean,
  activeUnavailable: boolean
) {
  const unsupportedLegacy =
    query.signal === 'logs' &&
    [query.logAnalysis, draft.signal === 'logs' ? draft.logAnalysis : undefined].some(hasUnsupportedLegacyLogAnalysis);
  return !sourceReady || dirty || activeUnavailable || unsupportedLegacy || !savable(query);
}

function useSavedViewReference(
  active: SavedQueryRecord | undefined,
  search: string,
  navigate: ReturnType<typeof useNavigate>
) {
  useEffect(() => {
    if (!active || !isSavedViewReference(search)) return;
    const result = readSavedQuery(active);
    if (result.kind === 'unavailable' && result.reason === 'retiredReferenceJoin') {
      const params = new URLSearchParams(search);
      params.set('logReferenceJoin', 'retired');
      void navigate({ search: params.toString() }, { replace: true });
      return;
    }
    if (result.kind !== 'ready') return;
    void navigate(buildExplorePath({ ...result.query, savedView: active.viewKey }), {
      replace: true,
      state: { replaceExploreQuery: true }
    });
  }, [active, search, navigate]);
}

function savable(query: ExploreQuery) {
  try {
    buildSavedQueryPayload(query, 'validation', 'Validation', '');
    return true;
  } catch {
    return false;
  }
}
