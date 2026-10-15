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

import { useState } from 'react';
import { useSession } from '@/core/auth/session-context';
import {
  addRecentLogSearch,
  readRecentLogSearches,
  recentLogSearchKey,
  type RecentLogSearch,
  type RecentLogSearchesViewModel
} from '../model/explore-recent-log-searches';
import type { ExploreSubmissionDraft } from '../model/explore-submission-model';

function read(key: string | undefined) {
  try {
    return key ? readRecentLogSearches(globalThis.sessionStorage.getItem(key)) : [];
  } catch {
    return [];
  }
}
export function useRecentLogSearches(): RecentLogSearchesViewModel {
  const { session } = useSession();
  const key =
    session?.authenticated && session.username && session.workspaceId
      ? recentLogSearchKey(session.workspaceId, session.username)
      : undefined;
  const [state, setState] = useState(() => ({ key, entries: read(key) }));
  if (state.key !== key) setState({ key, entries: read(key) });
  const entries = state.key === key ? state.entries : [];
  const save = (next: RecentLogSearch[]) => {
    if (!key) return;
    setState({ key, entries: next });
    try {
      globalThis.sessionStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* Keep this visit usable when browser storage is unavailable. */
    }
  };
  return {
    entries,
    record: (draft: ExploreSubmissionDraft) => save(addRecentLogSearch(entries, draft)),
    remove: (index: number) => save(entries.filter((_, item) => item !== index)),
    clear: () => save([])
  };
}
