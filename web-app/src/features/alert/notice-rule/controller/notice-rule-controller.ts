/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useDataProvider, useList, useNotification, type DataProvider, type HttpError } from '@refinedev/core';
import { useQuery } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiMessageError } from '@/core/http/api-message';

import { loadAllNoticeReceivers, loadAllNoticeTemplates } from '../api/notice-rule-api';
import {
  createNoticeRuleDraft,
  noticeRuleDraftFromDetail,
  validateNoticeRuleDependencies,
  validateNoticeRuleDraft,
  writeNoticeRuleQuery,
  type NoticeRule,
  type NoticeRuleDraft,
  type NoticeRuleListState,
  type NoticeRuleMutationVariables,
  type NoticeRuleQuery
} from '../model/notice-rule-model';
import { useNoticeRuleQueryController } from './notice-rule-query-controller';

type Command = 'idle' | 'loading-detail' | 'saving' | 'deleting';
type FailureKind = 'missing' | 'invalid' | 'unavailable' | 'error';
const noticeRuleResourceName = 'notice-rules';

export function useNoticeRuleController() {
  const { t } = useTranslation();
  const notification = useNotification();
  const queryController = useNoticeRuleQueryController();
  const options = useNoticeRuleOptions();
  const list = useNoticeRuleList(queryController.query);
  const provider = useDataProvider()(noticeRuleResourceName);
  const [draft, setDraft] = useState<NoticeRuleDraft | null>(null);
  const [command, setCommand] = useState<Command>('idle');
  const variables = useCallback((draft: NoticeRuleDraft): NoticeRuleMutationVariables => ({
    draft, receivers: options.receivers, templates: options.templates
  }), [options.receivers, options.templates]);
  const toggle = useNoticeRuleToggle({ command, list, notification, options, provider, t, variables });

  const edit = useCallback(async (id: number) => {
    if (command !== 'idle' || !provider.getOne) return;
    setCommand('loading-detail');
    try {
      const response = await provider.getOne<NoticeRule>({ resource: noticeRuleResourceName, id });
      setDraft(noticeRuleDraftFromDetail(response.data));
    } catch (error) {
      notify(notification, t, 'read', classify(error));
    } finally {
      setCommand('idle');
    }
  }, [command, notification, provider, t]);

  const persist = useCallback(async (nextDraft: NoticeRuleDraft, closeAfter: boolean) => {
    if (command !== 'idle' || options.kind !== 'ready') return false;
    if (validateNoticeRuleDraft(nextDraft).length
      || validateNoticeRuleDependencies(nextDraft, options.receivers, options.templates).length) {
      notification.open?.({ message: t('noticeRules.validation'), type: 'error' });
      return false;
    }
    setCommand('saving');
    try {
      if (nextDraft.id === undefined) {
        if (!provider.create) throw new Error('Notice rule create unavailable');
        await provider.create<NoticeRule, NoticeRuleMutationVariables>({
          resource: noticeRuleResourceName,
          variables: variables(nextDraft)
        });
      } else {
        if (!provider.update) throw new Error('Notice rule update unavailable');
        await provider.update<NoticeRule, NoticeRuleMutationVariables>({
          resource: noticeRuleResourceName,
          id: nextDraft.id,
          variables: variables(nextDraft)
        });
      }
      await list.refreshAuthoritatively();
      if (closeAfter) setDraft(null);
      notification.open?.({ message: t('noticeRules.saveSuccess'), type: 'success' });
      return true;
    } catch (error) {
      notify(notification, t, 'save', classify(error));
      return false;
    } finally {
      setCommand('idle');
    }
  }, [command, list, notification, options.kind, options.receivers, options.templates, provider, t, variables]);

  const remove = useCallback(async (rule: NoticeRule) => {
    if (command !== 'idle' || !provider.deleteOne) return;
    setCommand('deleting');
    try {
      await provider.deleteOne<NoticeRule>({ resource: noticeRuleResourceName, id: rule.id });
      await list.refreshAuthoritatively();
      notification.open?.({ message: t('noticeRules.deleteSuccess'), type: 'success' });
    } catch (error) {
      notify(notification, t, 'deleteError', classify(error));
    } finally {
      setCommand('idle');
    }
  }, [command, list, notification, provider, t]);

  return {
    state: {
      command, deleting: command === 'deleting', draft, editing: command === 'loading-detail',
      list: list.state,
      name: queryController.name,
      options: { kind: options.kind },
      query: queryController.query,
      receivers: options.receivers,
      refreshing: list.refreshing,
      saving: command === 'saving',
      templates: options.templates,
      togglingRuleId: toggle.ruleId
    },
    actions: {
      changePage: queryController.changePage,
      close: () => command === 'idle' && setDraft(null),
      create: () => command === 'idle' && options.kind === 'ready' && setDraft(createNoticeRuleDraft()),
      edit,
      refresh: list.refresh,
      remove,
      search: queryController.search,
      setName: queryController.setName,
      submit: () => draft ? persist(draft, true) : Promise.resolve(false),
      toggle: toggle.run,
      updateDraft: (patch: Partial<NoticeRuleDraft>) => setDraft(current => current ? { ...current, ...patch } : null)
    }
  };
}

function useNoticeRuleToggle({ command, list, notification, options, provider, t, variables }: {
  command: Command;
  list: ReturnType<typeof useNoticeRuleList>;
  notification: ReturnType<typeof useNotification>;
  options: ReturnType<typeof useNoticeRuleOptions>;
  provider: DataProvider;
  t: TFunction;
  variables: (draft: NoticeRuleDraft) => NoticeRuleMutationVariables;
}) {
  const [ruleId, setRuleId] = useState<number | null>(null);
  const run = useCallback(async (rule: NoticeRule, enable: boolean) => {
    if (command !== 'idle' || ruleId !== null || options.kind !== 'ready' || !provider.update) return false;
    const draft = { ...noticeRuleDraftFromDetail(rule), enable };
    if (validateNoticeRuleDraft(draft).length
      || validateNoticeRuleDependencies(draft, options.receivers, options.templates).length) return false;
    setRuleId(rule.id);
    try {
      await provider.update<NoticeRule, NoticeRuleMutationVariables>({
        resource: noticeRuleResourceName, id: rule.id, variables: variables(draft)
      });
      await list.refreshAuthoritatively();
      notification.open?.({ message: t('noticeRules.saveSuccess'), type: 'success' });
      return true;
    } catch (error) {
      notify(notification, t, 'save', classify(error));
      return false;
    } finally {
      setRuleId(null);
    }
  }, [command, list, notification, options, provider, ruleId, t, variables]);
  return { ruleId, run };
}

function useNoticeRuleOptions() {
  const receivers = useQuery({ queryKey: ['notice-receivers', 'all'], queryFn: loadAllNoticeReceivers, staleTime: 30_000 });
  const templates = useQuery({ queryKey: ['notice-templates', 'all'], queryFn: loadAllNoticeTemplates, staleTime: 30_000 });
  const failure = receivers.isError ? classify(receivers.error) : templates.isError ? classify(templates.error) : null;
  const kind = receivers.isPending || templates.isPending ? 'loading'
    : failure ?? (receivers.data?.length === 0 ? 'empty' : 'ready');
  return {
    kind,
    receivers: receivers.data ?? [],
    templates: templates.data ?? []
  };
}

function useNoticeRuleList(query: NoticeRuleQuery) {
  const queryKey = writeNoticeRuleQuery(query).toString();
  const [refreshFailure, setRefreshFailure] = useState<{ key: string; kind: FailureKind } | null>(null);
  const rules = useList<NoticeRule, HttpError>({
    resource: noticeRuleResourceName,
    dataProviderName: noticeRuleResourceName,
    pagination: { currentPage: query.pageIndex + 1, pageSize: query.pageSize, mode: 'server' },
    filters: query.name ? [{ field: 'name', operator: 'contains', value: query.name }] : [],
    errorNotification: false
  });
  const activeRefreshFailure = refreshFailure?.key === queryKey ? refreshFailure.kind : null;
  const state = useMemo(() => resolveListState(
    rules.query.isPending,
    activeRefreshFailure ?? (rules.query.isError ? classify(rules.query.error) : null),
    rules.result.data,
    rules.result.total
  ), [activeRefreshFailure, rules.query.error, rules.query.isError, rules.query.isPending,
    rules.result.data, rules.result.total]);
  const refreshAuthoritatively = useCallback(async () => {
    const result = await rules.query.refetch();
    if (result.isError) {
      const kind = classify(result.error);
      setRefreshFailure({ key: queryKey, kind });
      throw preserveFailure(result.error, kind);
    }
    if (!result.data || result.data.total === undefined) {
      setRefreshFailure({ key: queryKey, kind: 'invalid' });
      throw preserveFailure({ statusCode: 502, code: 'NOTICE_RULE_LIST_REREAD_INVALID' }, 'invalid');
    }
    setRefreshFailure(null);
  }, [queryKey, rules.query]);
  return {
    state,
    refreshAuthoritatively,
    refresh: () => void refreshAuthoritatively().catch(() => undefined),
    refreshing: rules.query.isFetching
  };
}

function preserveFailure(error: unknown, kind: FailureKind) {
  if (error instanceof Error) return error;
  const candidate = error && typeof error === 'object' ? error : {};
  return Object.assign(new Error(`Notice rule ${kind} failure`), candidate);
}

function resolveListState(
  pending: boolean,
  failure: FailureKind | null,
  records: NoticeRule[],
  total?: number
): NoticeRuleListState {
  if (pending) return { kind: 'loading' };
  if (failure) return { kind: failure };
  if (total === undefined) return { kind: 'invalid' };
  if (records.length === 0 && total === 0) return { kind: 'empty' };
  return { kind: 'ready', records, total };
}

function classify(error: unknown): FailureKind {
  const candidate = error as Partial<HttpError> & { code?: string | number };
  if (candidate.statusCode === 404 || candidate.code === 'NOTICE_RULE_MISSING') return 'missing';
  if (typeof candidate.code === 'string'
    && (candidate.code.startsWith('NOTICE_RULE_') || candidate.code.startsWith('NOTICE_RECEIVER_'))) return 'invalid';
  if (error instanceof ApiMessageError && error.code === undefined && error.status === undefined) return 'unavailable';
  if (candidate.statusCode === 0 || [502, 503, 504].includes(candidate.statusCode ?? -1)) return 'unavailable';
  return 'error';
}

function notify(
  notification: ReturnType<typeof useNotification>,
  t: (key: string) => string,
  operation: 'read' | 'save' | 'deleteError',
  failure: FailureKind
) {
  notification.open?.({ message: t(`noticeRules.${operation}.${failure}`), type: 'error' });
}
