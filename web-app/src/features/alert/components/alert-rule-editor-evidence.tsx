/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Spin } from 'antd';
import { useTranslation } from 'react-i18next';

import type {
  AlertRuleEditorDetailState,
  AlertRuleEditorFailure,
  AlertRulePreviewState,
  AlertRuleSaveRecovery
} from '../controller/use-alert-rule-editor-controller';
import type { AlertRuleDatasourceState } from '../model/alert-rule-model';

export function AlertRuleDetailEvidence(props: { state: AlertRuleEditorDetailState; retry: () => unknown }) {
  const { t } = useTranslation();
  if (props.state.kind === 'ready') return null;
  if (props.state.kind === 'loading') return <Spin />;
  return (
    <Alert
      type="error"
      showIcon
      message={t(detailFailureMessageKey(props.state.kind))}
      action={
        <Button size="small" onClick={() => void props.retry()}>
          {t('common.retry')}
        </Button>
      }
    />
  );
}

export function AlertRulePreviewEvidence({ state }: { state: AlertRulePreviewState }) {
  const { t } = useTranslation();
  if (state.kind === 'idle' || state.kind === 'loading') return null;
  if (state.kind === 'unavailable') return <Alert type="error" showIcon message={t('common.unavailable')} />;
  if (state.kind === 'error') return <Alert type="error" showIcon message={t('alertRules.previewFailed')} />;
  if (state.kind === 'empty') return <Alert type="warning" showIcon message={t('alertRules.previewEmpty')} />;
  return <Alert type="success" showIcon message={t('alertRules.previewSuccess', { count: state.matchCount })} />;
}

export function AlertRuleSaveEvidence({ failure }: { failure: AlertRuleEditorFailure | undefined }) {
  const { t } = useTranslation();
  if (!failure) return null;
  return <Alert type="error" showIcon message={t(saveFailureMessageKey(failure))} />;
}

export function AlertRuleDatasourceEvidence(props: { state: AlertRuleDatasourceState; retry: () => unknown }) {
  const { t } = useTranslation();
  if (props.state.kind === 'ready' && props.state.status.hasPromqlExecutor && props.state.status.hasSqlExecutor) {
    return null;
  }
  if (props.state.kind === 'loading') {
    return <Alert type="info" showIcon message={t('alertRules.datasource.checking')} />;
  }
  if (props.state.kind === 'ready') {
    return <Alert type="warning" showIcon message={t(datasourceMessageKey(props.state.status))} />;
  }
  return (
    <Alert
      type="error"
      showIcon
      message={t(props.state.kind === 'unavailable' ? 'common.unavailable' : 'common.routeError.description')}
      action={
        <Button size="small" onClick={() => void props.retry()}>
          {t('common.retry')}
        </Button>
      }
    />
  );
}

export function AlertRuleSaveRecoveryEvidence(props: {
  recovery: AlertRuleSaveRecovery | undefined;
  retrying: boolean;
  retry: () => unknown;
}) {
  const { t } = useTranslation();
  if (!props.recovery) return null;
  const message =
    props.recovery.failure === 'unavailable' ? t('common.unavailable') : t('common.routeError.description');
  return (
    <Alert
      type="warning"
      showIcon
      message={message}
      action={
        props.recovery.retryable ? (
          <Button size="small" disabled={props.retrying} onClick={() => void props.retry()}>
            {t('common.retry')}
          </Button>
        ) : undefined
      }
    />
  );
}

function datasourceMessageKey(status: Extract<AlertRuleDatasourceState, { kind: 'ready' }>['status']) {
  if (status.hasPromqlExecutor) return 'alertRules.datasource.promqlOnly';
  return status.hasSqlExecutor ? 'alertRules.datasource.sqlOnly' : 'alertRules.datasource.none';
}

function detailFailureMessageKey(failure: AlertRuleEditorFailure) {
  if (failure === 'missing') return 'common.notFound.description';
  if (failure === 'unavailable') return 'common.unavailable';
  return 'common.routeError.description';
}

function saveFailureMessageKey(failure: AlertRuleEditorFailure) {
  if (failure === 'missing') return 'common.notFound.description';
  if (failure === 'unavailable') return 'common.unavailable';
  return 'alertRules.saveFailed';
}
