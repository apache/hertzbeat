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

import { App } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { alertRoutePaths } from '@/shared/navigation/app-paths';

import { validateAlertRuleDraft, type AlertRuleDraft } from '../model/alert-rule-model';
import type { AlertRuleEditorIdentityController, AlertRuleRouteUpdate } from './alert-rule-editor-state';
import { useAlertRuleActionCapabilities } from './use-alert-rule-action-capabilities';
import { useAlertRuleSaveOperation } from './use-alert-rule-save-operation';

export function useAlertRuleCommandController(
  mode: 'new' | 'edit',
  draft: AlertRuleDraft | null,
  identity: AlertRuleEditorIdentityController,
  updateRoute: AlertRuleRouteUpdate
) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const capabilities = useAlertRuleActionCapabilities();
  const operation = useAlertRuleSaveOperation(
    mode,
    identity,
    updateRoute,
    {
      success: () => void message.success(t('alertRules.saveSuccess')),
      failure: (kind, retained) => {
        if (kind === 'unavailable') void message.warning(t('common.unavailable'));
        else if (kind === 'validation') void message.warning(t('alertRules.validation'));
        else if (kind === 'permission') void message.error(t('common.permission.roleRequiredDescription'));
        else if (retained) void message.error(t('common.routeError.description'));
        else void message.error(t('alertRules.saveFailed'));
      }
    },
    () => void navigate(alertRoutePaths.rules)
  );
  const save = async () => {
    if (!capabilities.canWrite) return;
    if (!draft || validateAlertRuleDraft(draft).length > 0) return;
    await operation.save(draft);
  };
  return { canSave: capabilities.canWrite, isLocked: operation.isLocked, retry: operation.retry, save };
}
