/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Input, Select, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AlertRuleMetricTargetState } from '../controller/use-alert-rule-metric-target-controller';
import {
  buildMetricAlertTargetCatalog,
  type AlertRuleDraft,
  type MetricAlertTargetCatalog,
  type RealtimeMetricTarget
} from '../model/alert-rule-model';
import styles from '../shared/alert-rule-editor.module.css';

type AlertRuleMetricTargetFieldsProps = {
  busy: boolean;
  draft: AlertRuleDraft;
  state: AlertRuleMetricTargetState;
  update: (patch: Partial<AlertRuleDraft>) => void;
  changeApplication: (application: string) => void;
  changeTarget: (target: RealtimeMetricTarget) => void;
  retryApps: () => unknown;
  retryHierarchy: () => unknown;
};

/** Renders the guided target boundary without rewriting unknown legacy expressions. */
export function AlertRuleMetricTargetFields(props: AlertRuleMetricTargetFieldsProps) {
  const { t } = useTranslation();
  const editor = props.draft.metricEditor;
  if (editor?.kind === 'unparsed') {
    return (
      <>
        <Alert
          className={styles.wide}
          type="warning"
          showIcon
          message={t('alertRules.metricTarget.legacyExpression')}
        />
        <ExpressionField {...props} />
      </>
    );
  }

  const selectedApp = editor?.kind === 'targeted' ? editor.app : '';
  const catalog = catalogFromState(props.state, t);
  return (
    <>
      <label>
        {t('alertRules.metricTarget.application')}
        <Select
          aria-label={t('alertRules.metricTarget.application')}
          disabled={props.busy || props.state.apps.kind !== 'ready'}
          loading={props.state.apps.kind === 'loading'}
          placeholder={t('alertRules.metricTarget.applicationPlaceholder')}
          value={selectedApp || undefined}
          options={
            props.state.apps.kind === 'ready'
              ? props.state.apps.apps.map(app => ({ value: app.value, label: app.label ?? app.value }))
              : []
          }
          onChange={application => props.changeApplication(application)}
        />
      </label>
      <TargetField {...props} catalog={catalog} selectedApp={selectedApp} />
      <TargetEvidence {...props} catalog={catalog} />
      {editor?.kind === 'targeted' && editor.target?.kind === 'availability' ? (
        <Typography.Text className={styles.wide} type="secondary">
          {t('alertRules.metricTarget.availabilityDescription')}
        </Typography.Text>
      ) : (
        <ExpressionField {...props} />
      )}
    </>
  );
}

function TargetField(
  props: AlertRuleMetricTargetFieldsProps & {
    catalog: MetricAlertTargetCatalog | null;
    selectedApp: string;
  }
) {
  const { t } = useTranslation();
  const editor = props.draft.metricEditor;
  const value = selectedTargetValue(editor);
  return (
    <label>
      {t('alertRules.metricTarget.target')}
      <Select
        aria-label={t('alertRules.metricTarget.target')}
        disabled={props.busy || !props.selectedApp || !props.catalog}
        loading={props.state.hierarchy.kind === 'loading'}
        placeholder={t('alertRules.metricTarget.targetPlaceholder')}
        value={value}
        options={
          props.catalog?.targets.map(option => ({
            value: option.target.kind === 'availability' ? 'availability' : `metric:${option.target.metric}`,
            label: option.label,
            target: option.target
          })) ?? []
        }
        onChange={(_, option) => {
          if (!Array.isArray(option) && option.target) props.changeTarget(option.target);
        }}
      />
    </label>
  );
}

function selectedTargetValue(editor: AlertRuleDraft['metricEditor']) {
  if (editor?.kind !== 'targeted' || !editor.target) return undefined;
  return editor.target.kind === 'availability' ? 'availability' : `metric:${editor.target.metric}`;
}

function TargetEvidence(
  props: AlertRuleMetricTargetFieldsProps & {
    catalog: MetricAlertTargetCatalog | null;
  }
) {
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

function ExpressionField({ busy, draft, update }: AlertRuleMetricTargetFieldsProps) {
  const { t } = useTranslation();
  return (
    <label className={styles.wide}>
      {t('alertRules.expression')}
      <Input.TextArea
        aria-label={t('alertRules.expression')}
        disabled={busy}
        rows={5}
        value={draft.expr}
        onChange={event => update({ expr: event.target.value })}
      />
    </label>
  );
}

function catalogFromState(
  state: AlertRuleMetricTargetState,
  t: ReturnType<typeof useTranslation>['t']
): MetricAlertTargetCatalog | null {
  if (state.hierarchy.kind !== 'ready') return null;
  try {
    return buildMetricAlertTargetCatalog(state.hierarchy.hierarchy, {
      availability: t('alertRules.metricTarget.availability'),
      rowCount: t('alertRules.metricTarget.rowCount')
    });
  } catch {
    return null;
  }
}
