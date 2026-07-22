/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useReducer, type Dispatch, type SetStateAction } from 'react';

import type { RemotePageState } from '@/shared/remote-state';

import { loadBulletins } from '../api/bulletin-api';
import { classifyBulletinFailure } from '../model/bulletin-failure';
import { isBulletinPageComplete, writeBulletinQuery, type Bulletin, type BulletinQuery } from '../model/bulletin-model';
import { bulletinQueryKeys } from './bulletin-query-keys';

type BulletinListFailure = 'invalid' | 'unavailable' | 'error';
export type BulletinListState = RemotePageState<Bulletin, BulletinListFailure>;

export function useBulletinListController(query: BulletinQuery) {
  const queryKey = bulletinQueryKeys.list(query);
  const list = useQuery({
    queryKey,
    queryFn: ({ signal }) => loadBulletins(query, signal),
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

type BulletinSelection = { scope: string; selectedId: number | null };
type BulletinSelectionAction =
  | { type: 'enter-scope'; from: string; scope: string }
  | { type: 'select'; scope: string; value: SetStateAction<number | null> }
  | { type: 'clear-invalid'; scope: string; selectedId: number };

export function useBulletinSelection(query: BulletinQuery, list: BulletinListState) {
  const scope = writeBulletinQuery(query).toString();
  const [selection, dispatch] = useReducer(reduceBulletinSelection, { scope, selectedId: null });
  const activeSelectedId = selection.scope === scope ? reconcileBulletinSelection(selection.selectedId, list) : null;

  useLayoutEffect(() => {
    if (selection.scope === scope) return;
    // Commit the new scope before events or command continuations can publish a selection.
    dispatch({ type: 'enter-scope', from: selection.scope, scope });
  }, [scope, selection.scope]);

  useEffect(() => {
    const selectedId = selection.selectedId;
    if (selection.scope !== scope || selectedId == null || activeSelectedId != null) return;
    if (list.kind === 'loading') return;
    let active = true;
    // Scope and id ownership prevent a retired list result from clearing a newer selection.
    queueMicrotask(() => {
      if (active) dispatch({ type: 'clear-invalid', scope, selectedId });
    });
    return () => {
      active = false;
    };
  }, [activeSelectedId, list.kind, scope, selection.scope, selection.selectedId]);

  const setSelectedId = useCallback<Dispatch<SetStateAction<number | null>>>(
    value => dispatch({ type: 'select', scope, value }),
    [scope]
  );
  return { selectedId: activeSelectedId, setSelectedId };
}

function reduceBulletinSelection(state: BulletinSelection, action: BulletinSelectionAction): BulletinSelection {
  if (action.type === 'enter-scope') {
    return state.scope === action.from ? { scope: action.scope, selectedId: null } : state;
  }
  if (action.type === 'clear-invalid') {
    return state.scope === action.scope && state.selectedId === action.selectedId
      ? { ...state, selectedId: null }
      : state;
  }
  if (state.scope !== action.scope) return state;
  const selectedId = typeof action.value === 'function' ? action.value(state.selectedId) : action.value;
  return { scope: action.scope, selectedId };
}

function resolveListState(
  list: ReturnType<typeof useQuery<Awaited<ReturnType<typeof loadBulletins>>>>
): BulletinListState {
  if (list.isPending) return { kind: 'loading' };
  if (list.isError) return { kind: classifyListFailure(list.error) };
  if (!isBulletinPageComplete(list.data)) return { kind: 'invalid' };
  if (list.data.content.length === 0) return { kind: 'empty' };
  return { kind: 'ready', records: list.data.content, total: list.data.totalElements };
}

function classifyListFailure(error: unknown): BulletinListFailure {
  const failure = classifyBulletinFailure(error);
  return failure === 'missing' ? 'error' : failure;
}
