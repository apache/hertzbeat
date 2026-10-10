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

import { useLocation, useNavigate } from 'react-router-dom';

import type { useSession } from '@/core/auth/session-context';
import { useSavedQueryActiveContext, useSavedViewReference } from './use-saved-query-active-context';

import { buildExplorePath, type ExploreQuery } from '../model/explore-model';
import {
  readSavedQuery,
  buildSavedQueryPayload,
  savedQueryConditions,
  type SavedQueryRecord
} from '../model/explore-saved-query-model';
import { hasUnappliedExploreDraft, type SavedQueriesViewModel } from '../model/explore-saved-query-view-model';
import type { ExploreSubmissionDraft } from '../model/explore-submission-model';
import { hasUnsupportedLegacyLogAnalysis } from '../model/explore-log-analysis';
import type { useSavedQueryCatalog } from './use-saved-query-catalog';
import { useSavedQueryEditor } from './use-saved-query-editor';
import type { useSavedViewDirectoryPreferences } from './use-saved-view-directory-preferences';
import { switchSavedQuery, switchDefaultView, selectSavedView, setSavedQueriesOpen } from './saved-query-switches';

export function useExploreSavedQueries(
  query: ExploreQuery,
  draft: ExploreSubmissionDraft,
  sourceReady = true
): SavedQueriesViewModel {
  const location = useLocation();
  const navigate = useNavigate();
  const open = location.hash === '#saved-queries';
  const { session, canWrite, catalog, group, active, directory } = useSavedQueryActiveContext(query, open);
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
  return savedQueriesViewModel({
    catalog,
    editor,
    open,
    active,
    activeUnavailable,
    activeLoading,
    activeChanged,
    dirty,
    canWrite,
    saveBlocked,
    sourceReady,
    query,
    session,
    reopen,
    reopenDefault,
    directory,
    location,
    navigate
  });
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

function savable(query: ExploreQuery) {
  try {
    buildSavedQueryPayload(query, 'validation', 'Validation', '');
    return true;
  } catch {
    return false;
  }
}

type SavedQueriesViewModelOptions = {
  catalog: ReturnType<typeof useSavedQueryCatalog>;
  editor: ReturnType<typeof useSavedQueryEditor>;
  open: boolean;
  active: SavedQueryRecord | undefined;
  activeUnavailable: boolean;
  activeLoading: boolean;
  activeChanged: boolean;
  dirty: boolean;
  canWrite: boolean;
  saveBlocked: boolean;
  sourceReady: boolean;
  query: ExploreQuery;
  session: ReturnType<typeof useSession>['session'];
  reopen: SavedQueriesViewModel['reopen'];
  reopenDefault: NonNullable<SavedQueriesViewModel['reopenDefault']>;
  directory: ReturnType<typeof useSavedViewDirectoryPreferences>;
  location: ReturnType<typeof useLocation>;
  navigate: ReturnType<typeof useNavigate>;
};

function savedQueriesViewModel({
  catalog,
  editor,
  open,
  active,
  activeUnavailable,
  activeLoading,
  activeChanged,
  dirty,
  canWrite,
  saveBlocked,
  sourceReady,
  query,
  session,
  reopen,
  reopenDefault,
  directory,
  location,
  navigate
}: SavedQueriesViewModelOptions): SavedQueriesViewModel {
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
