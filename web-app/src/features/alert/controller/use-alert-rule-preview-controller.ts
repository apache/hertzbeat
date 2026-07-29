/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { App } from 'antd';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { previewAlertRule } from '../api/alert-rule-api';
import {
  AlertRuleContractError,
  alertRuleFailureKind,
  buildAlertRulePreviewRequest,
  type AlertRuleDraft,
  type AlertRulePreviewRequest
} from '../model/alert-rule-model';
import type {
  AlertRuleEditorIdentityController,
  AlertRuleEditorOperationIdentity,
  AlertRuleRouteUpdate
} from './alert-rule-editor-state';

export function useAlertRulePreviewController(
  canPreview: boolean,
  draft: AlertRuleDraft | null,
  identity: AlertRuleEditorIdentityController,
  updateRoute: AlertRuleRouteUpdate
) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const previewEpochRef = useRef(0);
  const previousCanPreviewRef = useRef(canPreview);
  const invalidate = () => {
    previewEpochRef.current += 1;
  };
  const preview = async () => {
    if (!canPreview) return;
    if (!draft?.expr.trim()) {
      void message.warning(t('alertRules.expressionRequired'));
      return;
    }
    let request: AlertRulePreviewRequest;
    try {
      request = buildAlertRulePreviewRequest(draft);
    } catch (reason) {
      updateRoute({ preview: { kind: reason instanceof AlertRuleContractError ? 'input' : 'error' } });
      return;
    }
    const owner = identity.capture();
    const epoch = previewEpochRef.current + 1;
    previewEpochRef.current = epoch;
    updateRoute({ preview: { kind: 'loading' } });
    await runPreviewRequest(request, owner, epoch, previewEpochRef, identity, updateRoute);
  };
  useEffect(() => {
    const lostAccess = previousCanPreviewRef.current && !canPreview;
    previousCanPreviewRef.current = canPreview;
    if (!lostAccess) return;
    previewEpochRef.current += 1;
    updateRoute({ preview: { kind: 'idle' } });
  }, [canPreview, updateRoute]);
  return { invalidate, preview };
}

async function runPreviewRequest(
  request: AlertRulePreviewRequest,
  owner: AlertRuleEditorOperationIdentity,
  epoch: number,
  previewEpochRef: { current: number },
  identity: AlertRuleEditorIdentityController,
  updateRoute: AlertRuleRouteUpdate
) {
  try {
    const evidence = await previewAlertRule(request);
    if (!identity.isCurrent(owner) || previewEpochRef.current !== epoch) return;
    updateRoute({
      preview: evidence.rowCount === 0 ? { kind: 'empty' } : { kind: 'ready', ...evidence }
    });
  } catch (reason) {
    if (!identity.isCurrent(owner) || previewEpochRef.current !== epoch) return;
    updateRoute({ preview: { kind: resolvePreviewFailureKind(reason) } });
  }
}

function resolvePreviewFailureKind(reason: unknown) {
  if (reason instanceof AlertRuleContractError) return 'invalid';
  const failure = alertRuleFailureKind(reason);
  if (failure === 'permission' || failure === 'unavailable') return failure;
  return 'error';
}
