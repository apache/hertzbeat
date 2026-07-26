/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Input, InputNumber, Select, Switch } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  firstSupportedPeriodicDataType,
  isAlertRuleStrategySupported,
  type AlertRuleDatasourceState,
  type AlertRuleDataType,
  type AlertRuleDraft,
  type AlertRuleKind
} from '../model/alert-rule-model';
import type { AlertRuleMetricTargetState } from '../model/alert-rule-metric-target-state';
import styles from '../shared/alert-rule-editor.module.css';
import { AlertRuleMetricBindingField, type MetricBindingViewState } from './alert-rule-metric-binding-field';
import { AlertRuleMetricTargetFields } from './alert-rule-metric-target-fields';

type AlertRuleFieldsProps = {
  draft: AlertRuleDraft;
  busy: boolean;
  datasource: AlertRuleDatasourceState;
  update: (patch: Partial<AlertRuleDraft>) => void;
  changeDataType: (dataType: AlertRuleDataType) => void;
  changeKind: (kind: AlertRuleKind) => void;
  metricTarget: AlertRuleMetricTargetState;
  metricBindings: MetricBindingViewState;
  changeMetricApplication: (application: string) => void;
  changeMetricAuthoringMode: Parameters<typeof AlertRuleMetricTargetFields>[0]['changeAuthoringMode'];
  changeMetricExpertCondition: Parameters<typeof AlertRuleMetricTargetFields>[0]['changeExpertCondition'];
  changeMetricStructuredCondition: Parameters<typeof AlertRuleMetricTargetFields>[0]['changeStructuredCondition'];
  changeMetricTarget: Parameters<typeof AlertRuleMetricTargetFields>[0]['changeTarget'];
  openMetricBindings: () => void;
  cancelMetricBindings: () => void;
  confirmMetricBindings: () => void;
  changeMetricBindingIds: (ids: number[]) => void;
  changeMetricBindingLabels: (labels: string[]) => void;
  retryMetricBindings: () => unknown;
  retryMetricTargetApps: () => unknown;
  retryMetricTargetHierarchy: () => unknown;
};

export function AlertRuleFields(props: AlertRuleFieldsProps) {
  return (
    <div className={styles.form}>
      <AlertRuleStrategyFields {...props} />
      <AlertRuleDefinitionFields {...props} />
    </div>
  );
}

function AlertRuleStrategyFields({
  draft,
  busy,
  datasource,
  update,
  changeDataType,
  changeKind
}: AlertRuleFieldsProps) {
  const { t } = useTranslation();
  const kinds: AlertRuleKind[] = ['realtime', 'periodic'];
  const dataTypes: AlertRuleDataType[] = draft.kind === 'periodic' ? ['metric', 'log', 'trace'] : ['metric', 'log'];
  const periodicAvailable = datasource.kind === 'ready' && firstSupportedPeriodicDataType(datasource.status) !== null;
  return (
    <>
      <label>
        {t('alertRules.name')}
        <Input disabled={busy} value={draft.name} onChange={event => update({ name: event.target.value })} />
      </label>
      <label>
        {t('alertRules.kind.label')}
        <Select
          disabled={busy}
          value={draft.kind}
          onChange={changeKind}
          options={kinds.map(value => ({
            value,
            label: t(`alertRules.kind.${value}`),
            disabled: value === 'periodic' && draft.kind !== 'periodic' && !periodicAvailable
          }))}
        />
      </label>
      <label>
        {t('alertRules.dataType.label')}
        <Select
          disabled={busy}
          value={draft.dataType}
          onChange={changeDataType}
          options={dataTypes.map(value => ({
            value,
            label: t(`alertRules.dataType.${value}`),
            disabled:
              draft.kind === 'periodic' &&
              (datasource.kind !== 'ready' || !isAlertRuleStrategySupported(datasource.status, draft.kind, value))
          }))}
        />
      </label>
      <label>
        {t('alertRules.enabled')}
        <Switch checked={draft.enable} disabled={busy} onChange={enable => update({ enable })} />
      </label>
    </>
  );
}

function AlertRuleDefinitionFields({
  draft,
  busy,
  metricTarget,
  metricBindings,
  update,
  changeMetricApplication,
  changeMetricAuthoringMode,
  changeMetricExpertCondition,
  changeMetricStructuredCondition,
  changeMetricTarget,
  openMetricBindings,
  cancelMetricBindings,
  confirmMetricBindings,
  changeMetricBindingIds,
  changeMetricBindingLabels,
  retryMetricBindings,
  retryMetricTargetApps,
  retryMetricTargetHierarchy
}: AlertRuleFieldsProps) {
  const { t } = useTranslation();
  return (
    <>
      {draft.kind === 'realtime' && draft.dataType === 'metric' ? (
        <>
          <AlertRuleMetricTargetFields
            busy={busy}
            draft={draft}
            state={metricTarget}
            update={update}
            changeApplication={changeMetricApplication}
            changeAuthoringMode={changeMetricAuthoringMode}
            changeExpertCondition={changeMetricExpertCondition}
            changeStructuredCondition={changeMetricStructuredCondition}
            changeTarget={changeMetricTarget}
            retryApps={retryMetricTargetApps}
            retryHierarchy={retryMetricTargetHierarchy}
          />
          <AlertRuleMetricBindingField
            busy={busy}
            state={metricBindings}
            open={openMetricBindings}
            cancel={cancelMetricBindings}
            confirm={confirmMetricBindings}
            changeMonitorIds={changeMetricBindingIds}
            changeLabels={changeMetricBindingLabels}
            retry={retryMetricBindings}
          />
        </>
      ) : (
        <label className={styles.wide}>
          {t('alertRules.expression')}
          <Input.TextArea
            disabled={busy}
            rows={5}
            value={draft.expr}
            onChange={event => update({ expr: event.target.value })}
          />
        </label>
      )}
      <label className={styles.wide}>
        {t('alertRules.template')}
        <Input.TextArea
          disabled={busy}
          rows={3}
          value={draft.template}
          onChange={event => update({ template: event.target.value })}
        />
      </label>
      <label className={styles.wide}>
        {t('alertRules.labels')}
        <Input
          disabled={busy}
          value={draft.labelsText}
          placeholder={t('alertRules.labelsPlaceholder')}
          onChange={event => update({ labelsText: event.target.value })}
        />
      </label>
      {draft.kind === 'periodic' && (
        <label>
          {t('alertRules.period')}
          <InputNumber disabled={busy} min={1} value={draft.period} onChange={period => update({ period })} />
        </label>
      )}
      <label>
        {t('alertRules.times')}
        <InputNumber disabled={busy} min={1} value={draft.times} onChange={times => update({ times })} />
      </label>
    </>
  );
}
