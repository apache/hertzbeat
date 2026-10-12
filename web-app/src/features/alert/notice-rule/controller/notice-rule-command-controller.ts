/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useDataProvider, useNotification } from '@refinedev/core';
import { useTranslation } from 'react-i18next';

import type { NoticeRule } from '../model/notice-rule-model';
import { noticeRuleDetailMismatchFailure } from '../model/notice-rule-failure';
import { noticeRuleResourceName } from '../notice-rule-resource';
import { useNoticeRuleCommandGate } from './notice-rule-command-gate';
import { useNoticeRuleEditorController } from './notice-rule-editor-controller';
import type { useNoticeRuleList, useNoticeRuleOptions } from './notice-rule-read-controller';
import type { NoticeRuleCommandNotifications } from './notice-rule-command-types';
import {
  persistNoticeRule,
  removeNoticeRule,
  retryNoticeRuleOperation,
  toggleNoticeRule
} from './notice-rule-write-operations';
import { useNoticeRuleActionCapabilities } from './use-notice-rule-action-capabilities';
import { useNoticeRuleRoleLossRetirement } from './use-notice-rule-role-loss-retirement';
import { canPerformRetainedNoticeRuleAction } from './notice-rule-action-admission';

export function useNoticeRuleCommandController({
  list,
  options
}: {
  list: ReturnType<typeof useNoticeRuleList>;
  options: ReturnType<typeof useNoticeRuleOptions>;
}) {
  const { t } = useTranslation();
  const notification = useNotification();
  const provider = useDataProvider()(noticeRuleResourceName);
  const capabilities = useNoticeRuleActionCapabilities();
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
    saveFailure: failure => notification.open?.({ message: t(`noticeRules.save.${failure}`), type: 'error' }),
    deleteFailure: failure => notification.open?.({ message: t(`noticeRules.deleteError.${failure}`), type: 'error' })
  };
  const loadDetail = async (id: number) => {
    if (!provider.getOne) throw new Error('Notice rule detail unavailable');
    const response = await provider.getOne<NoticeRule>({ resource: noticeRuleResourceName, id });
    if (response.data.id !== id) throw noticeRuleDetailMismatchFailure();
    return response.data;
  };
  const editor = useNoticeRuleEditorController({
    capabilities,
    gate,
    loadDetail,
    options: {
      ready: options.kind === 'ready',
      receivers: options.receivers,
      templates: options.templates
    }
  });
  const context = { capabilities, list, options, provider, gate, editor, loadDetail, notify };
  useNoticeRuleRoleLossRetirement({ capabilities, editor, gate });
  return {
    capabilities,
    canRetryOperation: canPerformRetainedNoticeRuleAction(capabilities, gate.retainedReceipt()),
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
