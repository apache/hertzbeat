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

function AlertRuleDefinitionFields(props: AlertRuleFieldsProps) {
  return (
    <>
      <AlertRuleConditionFields {...props} />
      <AlertRuleNotificationFields draft={props.draft} busy={props.busy} update={props.update} />
    </>
  );
}

function AlertRuleConditionFields(props: AlertRuleFieldsProps) {
  const { t } = useTranslation();
  return (
    <>
      {props.draft.kind === 'realtime' && props.draft.dataType === 'metric' ? (
        <>
          <AlertRuleMetricTargetFields
            busy={props.busy}
            draft={props.draft}
            state={props.metricTarget}
            update={props.update}
            changeApplication={props.changeMetricApplication}
            changeAuthoringMode={props.changeMetricAuthoringMode}
            changeExpertCondition={props.changeMetricExpertCondition}
            changeStructuredCondition={props.changeMetricStructuredCondition}
            changeTarget={props.changeMetricTarget}
            retryApps={props.retryMetricTargetApps}
            retryHierarchy={props.retryMetricTargetHierarchy}
          />
          <AlertRuleMetricBindingField
            busy={props.busy}
            state={props.metricBindings}
            open={props.openMetricBindings}
            cancel={props.cancelMetricBindings}
            confirm={props.confirmMetricBindings}
            changeMonitorIds={props.changeMetricBindingIds}
            changeLabels={props.changeMetricBindingLabels}
            retry={props.retryMetricBindings}
          />
        </>
      ) : (
        <label className={styles.wide}>
          {t('alertRules.expression')}
          <Input.TextArea
            disabled={props.busy}
            rows={5}
            value={props.draft.expr}
            onChange={event => props.update({ expr: event.target.value })}
          />
        </label>
      )}
    </>
  );
}

function AlertRuleNotificationFields({ draft, busy, update }: Pick<AlertRuleFieldsProps, 'draft' | 'busy' | 'update'>) {
  const { t } = useTranslation();
  return (
    <>
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
