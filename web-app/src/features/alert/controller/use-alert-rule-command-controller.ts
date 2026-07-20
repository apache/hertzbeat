/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { App } from 'antd';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { alertRoutePaths } from '@/shared/navigation/app-paths';

import { classifyAlertRuleReadError, saveAlertRule } from '../alert-rule-api';
import { buildAlertRulePayload, validateAlertRuleDraft, type AlertRuleDraft } from '../alert-rule-model';
import { proveCreatedAlertRule, proveUpdatedAlertRule } from '../alert-rule-write-proof';
import type {
  AlertRuleEditorIdentityController,
  AlertRuleEditorOperationIdentity,
  AlertRuleRouteUpdate
} from './alert-rule-editor-state';

export function useAlertRuleCommandController(
  mode: 'new' | 'edit',
  draft: AlertRuleDraft | null,
  identity: AlertRuleEditorIdentityController,
  updateRoute: AlertRuleRouteUpdate
) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const ownerRef = useRef<AlertRuleEditorOperationIdentity | null>(null);
  const isLocked = () => ownerRef.current !== null && identity.isCurrent(ownerRef.current);
  const save = async () => {
    if (!draft || validateAlertRuleDraft(draft).length > 0) {
      void message.warning(t('alertRules.validation'));
      return;
    }
    if (isLocked()) return;
    const owner = identity.capture();
    ownerRef.current = owner;
    updateRoute({ command: 'saving', saveFailure: undefined });
    try {
      await saveAlertRule(mode, draft);
      if (!identity.isCurrent(owner)) return;
      const expected = buildAlertRulePayload(draft);
      if (mode === 'edit') await proveUpdatedAlertRule(draft, expected);
      else await proveCreatedAlertRule(expected);
      if (!identity.isCurrent(owner)) return;
      void message.success(t('alertRules.saveSuccess'));
      void navigate(alertRoutePaths.rules);
    } catch (reason) {
      if (!identity.isCurrent(owner)) return;
      updateRoute({ saveFailure: classifyAlertRuleReadError(reason) });
      void message.error(t('alertRules.saveFailed'));
    } finally {
      if (ownerRef.current === owner) ownerRef.current = null;
      if (identity.isCurrent(owner)) updateRoute({ command: 'idle' });
    }
  };
  return { isLocked, save };
}
