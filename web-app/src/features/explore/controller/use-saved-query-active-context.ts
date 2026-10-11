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

import { useEffect } from 'react';
import type { useNavigate } from 'react-router-dom';
import { useSession } from '@/core/auth/session-context';
import { buildExplorePath, type ExploreQuery } from '../model/explore-model';
import { readSavedQuery, isSavedViewReference, type SavedQueryRecord } from '../model/explore-saved-query-model';
import { useSavedQueryCatalog } from './use-saved-query-catalog';
import { useSavedViewDirectoryPreferences } from './use-saved-view-directory-preferences';

export function useSavedQueryActiveContext(query: ExploreQuery, open: boolean) {
  const { session } = useSession();
  const canWrite = hasSavedViewWriteRole(session?.roles);
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
  return { session, canWrite, catalog, group, active, directory };
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

export function useSavedViewReference(
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
