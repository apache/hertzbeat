/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { App } from 'antd';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { previewAlertRule } from '../alert-rule-api';
import { alertRuleFailureKind, type AlertRuleDraft } from '../alert-rule-model';
import type { AlertRuleEditorIdentityController, AlertRuleRouteUpdate } from './alert-rule-editor-state';

export function useAlertRulePreviewController(
  draft: AlertRuleDraft | null,
  identity: AlertRuleEditorIdentityController,
  updateRoute: AlertRuleRouteUpdate
) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const previewEpochRef = useRef(0);
  const invalidate = () => {
    previewEpochRef.current += 1;
  };
  const preview = async () => {
    if (!draft?.expr.trim()) {
      void message.warning(t('alertRules.expressionRequired'));
      return;
    }
    const owner = identity.capture();
    const epoch = previewEpochRef.current + 1;
    previewEpochRef.current = epoch;
    updateRoute({ preview: { kind: 'loading' } });
    try {
      const records = await previewAlertRule(draft);
      if (!identity.isCurrent(owner) || previewEpochRef.current !== epoch) return;
      updateRoute({ preview: records.length === 0 ? { kind: 'empty' } : { kind: 'ready', records } });
    } catch (reason) {
      if (!identity.isCurrent(owner) || previewEpochRef.current !== epoch) return;
      const kind = alertRuleFailureKind(reason) === 'unavailable' ? 'unavailable' : 'error';
      updateRoute({ preview: { kind } });
    }
  };
  return { invalidate, preview };
}
