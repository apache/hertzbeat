/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useDataProvider, useNotification, type DataProvider } from '@refinedev/core';
import { useTranslation } from 'react-i18next';

import {
  noticeRuleDraftFromDetail,
  validateNoticeRuleDependencies,
  validateNoticeRuleDraft,
  type NoticeRule,
  type NoticeRuleDraft,
  type NoticeRuleFailureKind,
  type NoticeRuleMutationVariables
} from '../model/notice-rule-model';
import { noticeRuleResourceName } from '../notice-rule-resource';
import { classifyNoticeRuleFailure, classifyNoticeRuleWriteFailure } from './notice-rule-failure';
import {
  useNoticeRuleCommandGate,
  useNoticeRuleEditorController,
  type NoticeRuleCommandGate,
  type NoticeRuleEditorController
} from './notice-rule-editor-controller';
import type { useNoticeRuleList, useNoticeRuleOptions } from './notice-rule-read-controller';

export function useNoticeRuleCommandController(
  list: ReturnType<typeof useNoticeRuleList>,
  options: ReturnType<typeof useNoticeRuleOptions>
) {
  const { t } = useTranslation();
  const notification = useNotification();
  const provider = useDataProvider()(noticeRuleResourceName);
  const gate = useNoticeRuleCommandGate();
  const notify: NoticeRuleCommandNotifications = {
    validation: () => notification.open?.({ message: t('noticeRules.validation'), type: 'error' }),
    saveSuccess: () => notification.open?.({ message: t('noticeRules.saveSuccess'), type: 'success' }),
    deleteSuccess: () => notification.open?.({ message: t('noticeRules.deleteSuccess'), type: 'success' }),
    readFailure: failure => notification.open?.({ message: t(`noticeRules.read.${failure}`), type: 'error' }),
    saveFailure: failure => notification.open?.({ message: t(`noticeRules.save.${failure}`), type: 'error' }),
    deleteFailure: failure => notification.open?.({ message: t(`noticeRules.deleteError.${failure}`), type: 'error' })
  };
  const loadDetail = async (id: number) => {
    if (!provider.getOne) throw new Error('Notice rule detail unavailable');
    const response = await provider.getOne<NoticeRule>({ resource: noticeRuleResourceName, id });
    if (response.data.id !== id)
      throw Object.assign(new Error('Notice rule detail id mismatch'), {
        code: 'NOTICE_RULE_DETAIL_INVALID'
      });
    return response.data;
  };
  const editor = useNoticeRuleEditorController(
    gate,
    { ready: options.kind === 'ready', receivers: options.receivers, templates: options.templates },
    loadDetail,
    reason => notify.readFailure(classifyNoticeRuleFailure(reason))
  );
  const context = { list, options, provider, gate, editor, loadDetail, notify };
  const persist = createNoticeRulePersist(context);
  const operations = createNoticeRuleOperations(context);
  return { gate, editor, actions: { submit: () => persist(editor.draft), ...operations } };
}

type NoticeRuleList = ReturnType<typeof useNoticeRuleList>;
type NoticeRuleOptions = ReturnType<typeof useNoticeRuleOptions>;
type WriteFailure = Exclude<NoticeRuleFailureKind, 'missing'>;

type NoticeRuleCommandNotifications = {
  validation: () => void;
  saveSuccess: () => void;
  deleteSuccess: () => void;
  readFailure: (failure: NoticeRuleFailureKind) => void;
  saveFailure: (failure: WriteFailure) => void;
  deleteFailure: (failure: WriteFailure) => void;
};

type NoticeRuleCommandContext = {
  list: NoticeRuleList;
  options: NoticeRuleOptions;
  provider: DataProvider;
  gate: NoticeRuleCommandGate;
  editor: NoticeRuleEditorController;
  loadDetail: (id: number) => Promise<NoticeRule>;
  notify: NoticeRuleCommandNotifications;
};

function mutationVariables(draft: NoticeRuleDraft, options: NoticeRuleOptions): NoticeRuleMutationVariables {
  return { draft, receivers: options.receivers, templates: options.templates };
}

function validMutation(draft: NoticeRuleDraft, options: NoticeRuleOptions) {
  return (
    validateNoticeRuleDraft(draft).length === 0 &&
    validateNoticeRuleDependencies(draft, options.receivers, options.templates).length === 0
  );
}

function createNoticeRulePersist(context: NoticeRuleCommandContext) {
  return async (draft: NoticeRuleDraft | null) => {
    if (context.options.kind !== 'ready') return false;
    if (!draft || !validMutation(draft, context.options)) {
      context.notify.validation();
      return false;
    }
    if (!context.gate.begin('saving')) return false;
    context.editor.invalidateDetail();
    try {
      const variables = mutationVariables(draft, context.options);
      if (draft.id === undefined) {
        if (!context.provider.create) throw new Error('Notice rule create unavailable');
        await context.provider.create<NoticeRule, NoticeRuleMutationVariables>({
          resource: noticeRuleResourceName,
          variables
        });
      } else {
        if (!context.provider.update) throw new Error('Notice rule update unavailable');
        await context.provider.update<NoticeRule, NoticeRuleMutationVariables>({
          resource: noticeRuleResourceName,
          id: draft.id,
          variables
        });
      }
      await context.list.refreshAuthoritatively();
      context.editor.setDraft(null);
      context.notify.saveSuccess();
      return true;
    } catch (reason) {
      context.notify.saveFailure(classifyNoticeRuleWriteFailure(reason));
      return false;
    } finally {
      context.gate.end();
    }
  };
}

function createNoticeRuleOperations(context: NoticeRuleCommandContext) {
  const toggle = async (rule: NoticeRule, enable: boolean) => {
    if (context.options.kind !== 'ready' || !context.provider.update || !context.gate.begin('toggling', rule.id))
      return false;
    context.editor.invalidateDetail();
    try {
      const current = await context.loadDetail(rule.id);
      const draft = { ...noticeRuleDraftFromDetail(current), enable };
      if (!validMutation(draft, context.options)) {
        throw Object.assign(new Error(), { code: 'NOTICE_RULE_VARIABLES_INVALID' });
      }
      await context.provider.update<NoticeRule, NoticeRuleMutationVariables>({
        resource: noticeRuleResourceName,
        id: rule.id,
        variables: mutationVariables(draft, context.options)
      });
      await context.list.refreshAuthoritatively();
      context.notify.saveSuccess();
      return true;
    } catch (reason) {
      context.notify.saveFailure(classifyNoticeRuleWriteFailure(reason));
      return false;
    } finally {
      context.gate.end();
    }
  };
  const remove = async (rule: NoticeRule) => {
    if (!context.provider.deleteOne || !context.gate.begin('deleting')) return;
    context.editor.invalidateDetail();
    try {
      await context.provider.deleteOne<NoticeRule>({ resource: noticeRuleResourceName, id: rule.id });
      await context.list.refreshAuthoritatively();
      context.notify.deleteSuccess();
    } catch (reason) {
      context.notify.deleteFailure(classifyNoticeRuleWriteFailure(reason));
    } finally {
      context.gate.end();
    }
  };
  return { toggle, remove };
}
