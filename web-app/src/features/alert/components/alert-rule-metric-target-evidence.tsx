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
    return <Alert className={styles.wide} type="info" showIcon message={t('alertRules.metricTarget.appsEmpty')} />;
  }
  if (props.state.apps.kind === 'unavailable' || props.state.apps.kind === 'error') {
    return (
      <RetryEvidence
        message={t(
          props.state.apps.kind === 'unavailable'
            ? 'alertRules.metricTarget.appsUnavailable'
            : 'alertRules.metricTarget.appsError'
        )}
        retry={props.retryApps}
      />
    );
  }
  if (props.state.hierarchy.kind === 'unavailable' || props.state.hierarchy.kind === 'error') {
    return (
      <RetryEvidence
        message={t(
          props.state.hierarchy.kind === 'unavailable'
            ? 'alertRules.metricTarget.hierarchyUnavailable'
            : 'alertRules.metricTarget.hierarchyError'
        )}
        retry={props.retryHierarchy}
      />
    );
  }
  if (props.state.hierarchy.kind === 'ready' && !props.catalog) {
    return (
      <Alert className={styles.wide} type="error" showIcon message={t('alertRules.metricTarget.hierarchyError')} />
    );
  }
  return null;
}

function RetryEvidence({ message, retry }: { message: string; retry: () => unknown }) {
  const { t } = useTranslation();
  return (
    <Alert
      className={styles.wide}
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
