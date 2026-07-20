/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useDataProvider, useList, type HttpError } from '@refinedev/core';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { requireExactNoticeReceiver } from '../model/notice-receiver-evidence';
import {
  classifyNoticeReceiverCollectionFailure,
  noticeReceiverRereadError,
  throwableNoticeReceiverError
} from '../model/notice-receiver-failure';
import type { NoticeReceiverListState } from '../model/notice-receiver-list-state';
import type { NoticeReceiver, NoticeReceiverQuery } from '../model/notice-receiver-model';
import { noticeReceiverResourceName } from '../notice-receiver-resource';

type VisibleRead = {
  identity: string;
  refetch: ReturnType<typeof useList<NoticeReceiver, HttpError>>['query']['refetch'];
};
type ReadFailure = { identity: string; error: unknown };

function useNoticeReceiverList(query: NoticeReceiverQuery) {
  return useList<NoticeReceiver, HttpError>({
    resource: noticeReceiverResourceName,
    dataProviderName: noticeReceiverResourceName,
    pagination: { currentPage: query.pageIndex + 1, pageSize: query.pageSize, mode: 'server' },
    filters: query.name ? [{ field: 'name', operator: 'contains', value: query.name }] : [],
    errorNotification: false
  });
}

export function useNoticeReceiverReadController(query: NoticeReceiverQuery) {
  const identity = JSON.stringify(query);
  const dataProvider = useDataProvider()(noticeReceiverResourceName);
  const [failure, setFailure] = useState<ReadFailure | null>(null);
  const mountedRef = useRef(true);
  const rereadEpochRef = useRef(0);
  const list = useNoticeReceiverList(query);
  const visibleReadRef = useRef<VisibleRead>({ identity, refetch: list.query.refetch });
  useLayoutEffect(() => {
    // A pending command proves against the query currently owned by the visible route.
    visibleReadRef.current = { identity, refetch: list.query.refetch };
  }, [identity, list.query.refetch]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      rereadEpochRef.current += 1;
    };
  }, []);
  const activeFailure = failure?.identity === identity ? failure.error : null;
  const state = useMemo(
    () =>
      resolveReadState(
        list.query.isPending,
        activeFailure ?? (list.query.isError ? list.query.error : null),
        list.result.data,
        list.result.total,
        list.query.isFetching
      ),
    [
      activeFailure,
      list.query.error,
      list.query.isError,
      list.query.isFetching,
      list.query.isPending,
      list.result.data,
      list.result.total
    ]
  );
  const rereadAuthoritatively = useAuthoritativeReread(visibleReadRef, mountedRef, rereadEpochRef, setFailure);
  const refresh = async () => {
    try {
      await rereadAuthoritatively();
    } catch {
      // The latest reread epoch owns the visible failure state.
    }
  };
  const loadExact = async (id: number) =>
    requireExactNoticeReceiver(
      (await dataProvider.getOne<NoticeReceiver>({ resource: noticeReceiverResourceName, id })).data,
      id
    );
  return { state, loadExact, rereadAuthoritatively, refresh };
}

function useAuthoritativeReread(
  visibleReadRef: { current: VisibleRead },
  mountedRef: { current: boolean },
  rereadEpochRef: { current: number },
  setFailure: (failure: ReadFailure | null) => void
) {
  return useCallback(async () => {
    const epoch = rereadEpochRef.current + 1;
    rereadEpochRef.current = epoch;
    const visible = visibleReadRef.current;
    const proof = await visible.refetch();
    if (visibleReadRef.current.identity !== visible.identity) {
      throw noticeReceiverRereadError('unavailable', 'NOTICE_RECEIVER_LIST_CONTEXT_CHANGED');
    }
    if (proof.isError) {
      if (mountedRef.current && rereadEpochRef.current === epoch) {
        setFailure({ identity: visible.identity, error: proof.error });
      }
      throw throwableNoticeReceiverError(proof.error);
    }
    if (!proof.data) {
      const error = noticeReceiverRereadError('invalid');
      if (mountedRef.current && rereadEpochRef.current === epoch) setFailure({ identity: visible.identity, error });
      throw error;
    }
    if (mountedRef.current && rereadEpochRef.current === epoch) setFailure(null);
    return { records: proof.data.data, total: proof.data.total };
  }, [mountedRef, rereadEpochRef, setFailure, visibleReadRef]);
}

function resolveReadState(
  pending: boolean,
  error: unknown,
  records: NoticeReceiver[],
  total: number | undefined,
  refreshing: boolean
) {
  return {
    list: resolveListState(pending, error, records, total),
    refreshing
  };
}

function resolveListState(
  pending: boolean,
  error: unknown,
  records: NoticeReceiver[],
  total?: number
): NoticeReceiverListState {
  if (pending) return { kind: 'loading' };
  if (error) return { kind: classifyNoticeReceiverCollectionFailure(error) };
  return total === undefined ? { kind: 'invalid' } : { kind: 'ready', records, total };
}
