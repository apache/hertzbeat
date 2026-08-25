/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';

import type { MetricAlertTargetCatalog } from '../model/alert-rule-model';
import type { AlertRuleMetricTargetState } from '../model/alert-rule-metric-target-state';
import styles from '../shared/alert-rule-editor.module.css';

const wideClassName = styles.wide ?? '';

type TargetEvidenceProps = {
  state: AlertRuleMetricTargetState;
  catalog: MetricAlertTargetCatalog | null;
  retryApps: () => unknown;
  retryHierarchy: () => unknown;
};

/** Keeps catalog failures visible without replacing the editor's other fields. */
export function AlertRuleMetricTargetEvidence(props: TargetEvidenceProps) {
  const { t } = useTranslation();
  if (props.state.apps.kind === 'ready' && props.state.apps.apps.length === 0) {
    return <Alert className={wideClassName} type="info" showIcon message={t('alertRules.metricTarget.appsEmpty')} />;
  }
  const failure = targetEvidenceFailure(props);
  if (failure) return <RetryEvidence message={t(failure.key)} retry={failure.retry} />;
  if (props.state.hierarchy.kind === 'ready' && !props.catalog) {
    return (
      <Alert className={wideClassName} type="error" showIcon message={t('alertRules.metricTarget.hierarchyError')} />
    );
  }
  return null;
}

function targetEvidenceFailure(props: TargetEvidenceProps) {
  const appKey = failureKey(
    props.state.apps.kind,
    'alertRules.metricTarget.appsUnavailable',
    'alertRules.metricTarget.appsError'
  );
  if (appKey) return { key: appKey, retry: props.retryApps };
  const catalogKey = failureKey(
    props.state.catalog?.kind,
    'alertRules.metricTarget.hierarchyUnavailable',
    'alertRules.metricTarget.hierarchyError'
  );
  if (catalogKey) return { key: catalogKey, retry: props.retryApps };
  const hierarchyKey = failureKey(
    props.state.hierarchy.kind,
    'alertRules.metricTarget.hierarchyUnavailable',
    'alertRules.metricTarget.hierarchyError'
  );
  return hierarchyKey ? { key: hierarchyKey, retry: props.retryHierarchy } : null;
}

function failureKey(kind: string | undefined, unavailableKey: string, errorKey: string) {
  if (kind === 'unavailable') return unavailableKey;
  if (kind === 'error') return errorKey;
  return null;
}

function RetryEvidence({ message, retry }: { message: string; retry: () => unknown }) {
  const { t } = useTranslation();
  return (
    <Alert
      className={wideClassName}
      type="error"
      showIcon
      message={message}
      action={
        <Button size="small" onClick={() => void retry()}>
          {t('common.retry')}
        </Button>
      }
    />
  );
}
