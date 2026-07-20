/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useDataProvider, useNotification } from '@refinedev/core';
import { useTranslation } from 'react-i18next';

import type { NoticeRule } from '../model/notice-rule-model';
import { noticeRuleDetailMismatchFailure, noticeRuleFailureKind } from '../model/notice-rule-failure';
import { noticeRuleResourceName } from '../notice-rule-resource';
import { useNoticeRuleCommandGate, useNoticeRuleEditorController } from './notice-rule-editor-controller';
import type { useNoticeRuleList, useNoticeRuleOptions } from './notice-rule-read-controller';
import type { NoticeRuleCommandNotifications } from './notice-rule-command-types';
import {
  persistNoticeRule,
  removeNoticeRule,
  retryNoticeRuleOperation,
  toggleNoticeRule
} from './notice-rule-write-operations';

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
    proofFailure: failure =>
      notification.open?.({
        message: t(failure === 'error' ? 'common.routeError.description' : 'common.unavailable'),
        type: 'error'
      }),
    readFailure: failure => notification.open?.({ message: t(`noticeRules.read.${failure}`), type: 'error' }),
    saveFailure: failure => notification.open?.({ message: t(`noticeRules.save.${failure}`), type: 'error' }),
    deleteFailure: failure => notification.open?.({ message: t(`noticeRules.deleteError.${failure}`), type: 'error' })
  };
  const loadDetail = async (id: number) => {
    if (!provider.getOne) throw new Error('Notice rule detail unavailable');
    const response = await provider.getOne<NoticeRule>({ resource: noticeRuleResourceName, id });
    if (response.data.id !== id) throw noticeRuleDetailMismatchFailure();
    return response.data;
  };
  const editor = useNoticeRuleEditorController(
    gate,
    { ready: options.kind === 'ready', receivers: options.receivers, templates: options.templates },
    loadDetail,
    reason => notify.readFailure(noticeRuleFailureKind(reason))
  );
  const context = { list, options, provider, gate, editor, loadDetail, notify };
  return {
    gate,
    editor,
    actions: {
      submit: () => persistNoticeRule(context, editor.draft),
      toggle: (rule: NoticeRule, enable: boolean) => toggleNoticeRule(context, rule, enable),
      remove: (rule: NoticeRule) => removeNoticeRule(context, rule),
      retry: () => retryNoticeRuleOperation(context)
    }
  };
}
