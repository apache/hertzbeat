/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
