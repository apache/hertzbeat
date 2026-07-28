/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
        else if (retained) void message.error(t('common.routeError.description'));
        else void message.error(t('alertRules.saveFailed'));
      }
    },
    () => void navigate(alertRoutePaths.rules)
  );
  const save = async () => {
    if (!capabilities.canWrite) return;
    if (!draft || validateAlertRuleDraft(draft).length > 0) {
      void message.warning(t('alertRules.validation'));
      return;
    }
    await operation.save(draft);
  };
  return { canSave: capabilities.canWrite, isLocked: operation.isLocked, retry: operation.retry, save };
}
