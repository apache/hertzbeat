/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useList, type HttpError } from '@refinedev/core';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { loadAllNoticeReceivers, loadAllNoticeTemplates } from '../api/notice-rule-api';
import {
  resolveNoticeRuleListState,
  writeNoticeRuleQuery,
  type NoticeRule,
  type NoticeRuleFailureKind,
  type NoticeRuleQuery
} from '../model/notice-rule-model';
import { noticeRuleResourceName } from '../notice-rule-resource';
import { classifyNoticeRuleFailure, preserveNoticeRuleFailure } from './notice-rule-failure';
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
  const failure = receivers.isError
    ? classifyNoticeRuleFailure(receivers.error)
    : templates.isError ? classifyNoticeRuleFailure(templates.error) : null;
  const kind = receivers.isPending || templates.isPending
    ? 'loading'
    : failure ?? (receivers.data?.length === 0 ? 'empty' : 'ready');
  return { kind, receivers: receivers.data ?? [], templates: templates.data ?? [] };
}

export function useNoticeRuleList(query: NoticeRuleQuery) {
  // A failed reread belongs only to the list context that produced it.
  const queryIdentity = writeNoticeRuleQuery(query).toString();
  const [refreshFailure, setRefreshFailure] = useState<{
    identity: string;
    kind: NoticeRuleFailureKind;
  } | null>(null);
  const rules = useList<NoticeRule, HttpError>({
    resource: noticeRuleResourceName,
    dataProviderName: noticeRuleResourceName,
    pagination: { currentPage: query.pageIndex + 1, pageSize: query.pageSize, mode: 'server' },
    filters: query.name ? [{ field: 'name', operator: 'contains', value: query.name }] : [],
    errorNotification: false
  });
  const activeRefreshFailure = refreshFailure?.identity === queryIdentity ? refreshFailure.kind : null;
  const state = useMemo(() => resolveNoticeRuleListState(
    rules.query.isPending,
    activeRefreshFailure ?? (rules.query.isError ? classifyNoticeRuleFailure(rules.query.error) : null),
    rules.result.data,
    rules.result.total
  ), [activeRefreshFailure, rules.query.error, rules.query.isError, rules.query.isPending,
    rules.result.data, rules.result.total]);
  const refreshAuthoritatively = useCallback(async () => {
    const result = await rules.query.refetch();
    if (result.isError) {
      const kind = classifyNoticeRuleFailure(result.error);
      setRefreshFailure({ identity: queryIdentity, kind });
      throw preserveNoticeRuleFailure(result.error, kind);
    }
    if (!result.data || result.data.total === undefined) {
      setRefreshFailure({ identity: queryIdentity, kind: 'invalid' });
      throw preserveNoticeRuleFailure({ statusCode: 502, code: 'NOTICE_RULE_LIST_REREAD_INVALID' }, 'invalid');
    }
    setRefreshFailure(null);
  }, [queryIdentity, rules.query]);
  return {
    state,
    refreshAuthoritatively,
    refresh: () => void refreshAuthoritatively().catch(() => undefined),
    refreshing: rules.query.isFetching
  };
}
