/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';

import type { RemotePageState } from '@/shared/remote-state';

import { classifyBulletinError, loadBulletins } from '../api/bulletin-api';
import type { Bulletin, BulletinQuery } from '../model/bulletin-model';
import { bulletinQueryKeys } from './bulletin-query-keys';

type BulletinListFailure = 'invalid' | 'unavailable' | 'error';
export type BulletinListState = RemotePageState<Bulletin, BulletinListFailure>;

export function useBulletinListController(query: BulletinQuery) {
  const queryKey = bulletinQueryKeys.list(query);
  const list = useQuery({
    queryKey,
    queryFn: () => loadBulletins(query),
    retry: false
  });
  const { refetch } = list;

  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const result = await refetch();
      return !result.isError && result.data !== undefined;
    } catch {
      return false;
    }
  }, [refetch]);

  return {
    refresh,
    refreshing: list.isFetching,
    state: resolveListState(list)
  };
}

export function reconcileBulletinSelection(
  selectedId: number | null,
  list: { kind: BulletinListState['kind']; records?: Array<Pick<Bulletin, 'id'>> }
) {
  if (selectedId == null || list.kind === 'loading') return selectedId;
  if (list.kind !== 'ready') return null;
  return list.records?.some(record => record.id === selectedId) ? selectedId : null;
}

export function useBulletinSelectionConvergence(
  selectedId: number | null,
  list: BulletinListState,
  setSelectedId: Dispatch<SetStateAction<number | null>>
) {
  const activeSelectedId = reconcileBulletinSelection(selectedId, list);
  useEffect(() => {
    if (selectedId == null || activeSelectedId != null) return;
    let active = true;
    queueMicrotask(() => {
      if (active) {
        setSelectedId(current => current === selectedId ? null : current);
      }
    });
    return () => {
      active = false;
    };
  }, [activeSelectedId, selectedId, setSelectedId]);
  return activeSelectedId;
}

function resolveListState(
  list: ReturnType<typeof useQuery<Awaited<ReturnType<typeof loadBulletins>>>>
): BulletinListState {
  if (list.isPending) return { kind: 'loading' };
  if (list.isError) return { kind: classifyListFailure(list.error) };
  if (list.data.content.length === 0) return { kind: 'empty' };
  return { kind: 'ready', records: list.data.content, total: list.data.totalElements };
}

function classifyListFailure(error: unknown): BulletinListFailure {
  const failure = classifyBulletinError(error);
  return failure === 'missing' ? 'error' : failure;
}
