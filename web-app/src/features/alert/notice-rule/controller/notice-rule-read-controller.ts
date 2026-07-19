/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useList, type HttpError } from '@refinedev/core';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { loadAllNoticeReceivers, loadAllNoticeTemplates } from '../api/notice-rule-api';
import {
  resolveNoticeRuleListState,
  writeNoticeRuleQuery,
  type NoticeRule,
  type NoticeRuleCollectionFailureKind,
  type NoticeRuleQuery
} from '../model/notice-rule-model';
import { noticeRuleResourceName } from '../notice-rule-resource';
import { classifyNoticeRuleCollectionFailure, preserveNoticeRuleFailure } from './notice-rule-failure';
import { noticeRuleQueryKeys } from './notice-rule-query-keys';

export function useNoticeRuleOptions() {
  const receivers = useQuery({
    queryKey: noticeRuleQueryKeys.receiverOptions(),
    queryFn: loadAllNoticeReceivers,
    staleTime: 30_000
  });
  const templates = useQuery({
    queryKey: noticeRuleQueryKeys.templateOptions(),
    queryFn: loadAllNoticeTemplates,
    staleTime: 30_000
  });
  const failure = noticeRuleOptionFailure(receivers, templates);
  const kind = noticeRuleOptionKind(receivers.isPending, templates.isPending, receivers.data, failure);
  return { kind, receivers: receivers.data ?? [], templates: templates.data ?? [] };
}

function noticeRuleOptionFailure(
  receivers: { isError: boolean; error: unknown },
  templates: { isError: boolean; error: unknown }
) {
  if (receivers.isError) return classifyNoticeRuleCollectionFailure(receivers.error);
  if (templates.isError) return classifyNoticeRuleCollectionFailure(templates.error);
  return null;
}

function noticeRuleOptionKind(
  receiversPending: boolean,
  templatesPending: boolean,
  receivers: unknown[] | undefined,
  failure: NoticeRuleCollectionFailureKind | null
): 'loading' | 'empty' | 'ready' | NoticeRuleCollectionFailureKind {
  if (receiversPending || templatesPending) return 'loading';
  if (failure) return failure;
  return receivers?.length === 0 ? 'empty' : 'ready';
}

export function useNoticeRuleList(query: NoticeRuleQuery) {
  // A failed reread belongs only to the list context that produced it.
  const queryIdentity = writeNoticeRuleQuery(query).toString();
  const [refreshFailure, setRefreshFailure] = useState<{
    identity: string;
    kind: NoticeRuleCollectionFailureKind;
  } | null>(null);
  const rules = useList<NoticeRule, HttpError>(noticeRuleListRequest(query));
  const refreshOwnerRef = useRef({ identity: queryIdentity, refetch: rules.query.refetch });
  const refreshEpochRef = useRef(0);
  useLayoutEffect(() => {
    // A pending command may outlive a route change; its reread must follow the current query owner.
    refreshOwnerRef.current = { identity: queryIdentity, refetch: rules.query.refetch };
  }, [queryIdentity, rules.query.refetch]);
  const activeRefreshFailure = refreshFailure?.identity === queryIdentity ? refreshFailure.kind : null;
  const state = useMemo(
    () =>
      resolveNoticeRuleListState(
        rules.query.isPending,
        activeRefreshFailure ?? (rules.query.isError ? classifyNoticeRuleCollectionFailure(rules.query.error) : null),
        rules.result.data,
        rules.result.total
      ),
    [
      activeRefreshFailure,
      rules.query.error,
      rules.query.isError,
      rules.query.isPending,
      rules.result.data,
      rules.result.total
    ]
  );
  const refreshAuthoritatively = useCallback(async () => {
    const epoch = refreshEpochRef.current + 1;
    refreshEpochRef.current = epoch;
    const owner = refreshOwnerRef.current;
    const result = await owner.refetch();
    if (result.isError) {
      const kind = classifyNoticeRuleCollectionFailure(result.error);
      if (refreshEpochRef.current === epoch) setRefreshFailure({ identity: owner.identity, kind });
      throw preserveNoticeRuleFailure(result.error, kind);
    }
    if (!result.data || result.data.total === undefined) {
      if (refreshEpochRef.current === epoch) setRefreshFailure({ identity: owner.identity, kind: 'invalid' });
      throw preserveNoticeRuleFailure({ statusCode: 502, code: 'NOTICE_RULE_LIST_REREAD_INVALID' }, 'invalid');
    }
    // An older success cannot erase failure evidence from a newer reread.
    if (refreshEpochRef.current === epoch) setRefreshFailure(null);
  }, []);
  const refresh = useCallback(async () => {
    try {
      await refreshAuthoritatively();
    } catch {
      // The list state owns the visible failure; manual refresh has no command caller to reject to.
    }
  }, [refreshAuthoritatively]);
  return { state, refreshAuthoritatively, refresh, refreshing: rules.query.isFetching };
}

function noticeRuleListRequest(query: NoticeRuleQuery) {
  return {
    resource: noticeRuleResourceName,
    dataProviderName: noticeRuleResourceName,
    pagination: { currentPage: query.pageIndex + 1, pageSize: query.pageSize, mode: 'server' as const },
    filters: query.name ? [{ field: 'name', operator: 'contains' as const, value: query.name }] : [],
    errorNotification: false as const
  };
}
