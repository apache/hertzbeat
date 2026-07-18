/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useDataProvider, useNotification, type DataProvider } from '@refinedev/core';
import type { TFunction } from 'i18next';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  createNoticeRuleDraft,
  noticeRuleDraftFromDetail,
  validateNoticeRuleDependencies,
  validateNoticeRuleDraft,
  type NoticeRule,
  type NoticeRuleDraft,
  type NoticeRuleFailureKind,
  type NoticeRuleMutationVariables,
} from '../model/notice-rule-model';
import { noticeRuleResourceName } from '../notice-rule-resource';
import { classifyNoticeRuleFailure } from './notice-rule-failure';
import { useNoticeRuleQueryController } from './notice-rule-query-controller';
import { useNoticeRuleList, useNoticeRuleOptions } from './notice-rule-read-controller';

type Command = 'idle' | 'loading-detail' | 'saving' | 'deleting';

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
      notify(notification, t, 'read', classifyNoticeRuleFailure(error));
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
      notify(notification, t, 'save', classifyNoticeRuleFailure(error));
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
      notify(notification, t, 'deleteError', classifyNoticeRuleFailure(error));
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
      notify(notification, t, 'save', classifyNoticeRuleFailure(error));
      return false;
    } finally {
      setRuleId(null);
    }
  }, [command, list, notification, options, provider, ruleId, t, variables]);
  return { ruleId, run };
}

function notify(
  notification: ReturnType<typeof useNotification>,
  t: (key: string) => string,
  operation: 'read' | 'save' | 'deleteError',
  failure: NoticeRuleFailureKind
) {
  notification.open?.({ message: t(`noticeRules.${operation}.${failure}`), type: 'error' });
}
