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

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  boundSavedViewDirectoryPreferences,
  readSavedViewDirectoryPreferences,
  recordSavedViewOpen,
  savedViewDirectoryKey,
  toggleSavedViewFavorite,
  type SavedViewDirectoryPreferences,
  type SavedViewSort
} from '../model/explore-saved-view-directory';
import type { SavedQueryRecord } from '../model/explore-saved-query-model';

function readStorage(key: string | undefined) {
  try {
    return key
      ? readSavedViewDirectoryPreferences(globalThis.localStorage.getItem(key))
      : readSavedViewDirectoryPreferences(null);
  } catch {
    return readSavedViewDirectoryPreferences(null);
  }
}

function writeStorage(key: string | undefined, preferences: SavedViewDirectoryPreferences) {
  if (!key) return;
  try {
    globalThis.localStorage.setItem(key, JSON.stringify(preferences));
  } catch {
    /* Keep saved-view controls usable when browser storage is unavailable. */
  }
}

export function useSavedViewDirectoryPreferences(
  identity: { workspaceId?: string | null; username?: string | null },
  records: SavedQueryRecord[],
  catalogReady: boolean,
  activeViewKey?: string
) {
  const key =
    identity.workspaceId && identity.username
      ? savedViewDirectoryKey(identity.workspaceId, identity.username)
      : undefined;
  const [state, setState] = useState(() => {
    const stored = readStorage(key);
    return { key, value: activeViewKey ? recordSavedViewOpen(stored, activeViewKey) : stored, activeViewKey };
  });
  if (state.key !== key) {
    const stored = readStorage(key);
    setState({ key, value: activeViewKey ? recordSavedViewOpen(stored, activeViewKey) : stored, activeViewKey });
  } else if (activeViewKey && state.activeViewKey !== activeViewKey) {
    setState({ key, value: recordSavedViewOpen(state.value, activeViewKey), activeViewKey });
  }
  const stored = state.key === key ? state.value : readStorage(key);
  const preferences = useMemo(
    () => (catalogReady ? boundSavedViewDirectoryPreferences(stored, records) : stored),
    [catalogReady, records, stored]
  );
  const update = useCallback(
    (change: (current: SavedViewDirectoryPreferences) => SavedViewDirectoryPreferences) => {
      let current = state.key === key ? state.value : readStorage(key);
      try {
        const raw = key ? globalThis.localStorage.getItem(key) : null;
        if (raw !== null) current = readSavedViewDirectoryPreferences(raw);
      } catch {
        /* Retain the in-memory preferences when browser storage is unavailable. */
      }
      const next = catalogReady ? boundSavedViewDirectoryPreferences(change(current), records) : change(current);
      setState({ key, value: next, activeViewKey: state.activeViewKey });
    },
    [catalogReady, key, records, state.activeViewKey, state.key, state.value]
  );
  useEffect(() => {
    if (key && state.key === key) writeStorage(key, preferences);
  }, [key, preferences, state.key]);

  return {
    preferences,
    setSort: (sort: SavedViewSort) => update(current => ({ ...current, sort })),
    setOnlyMine: (onlyMine: boolean) => update(current => ({ ...current, onlyMine })),
    toggleFavorite: (viewKey: string) => update(current => toggleSavedViewFavorite(current, viewKey)),
    recordOpen: (viewKey: string) => update(current => recordSavedViewOpen(current, viewKey))
  };
}
