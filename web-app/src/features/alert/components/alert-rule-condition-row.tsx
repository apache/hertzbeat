/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { DeleteOutlined } from '@ant-design/icons';
import { Button, Input, InputNumber, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  changeMetricAlertConditionField,
  changeMetricAlertConditionOperator,
  metricAlertOperatorsForType,
  removeMetricAlertConditionItem,
  updateMetricAlertConditionValue,
  type MetricAlertCondition,
  type MetricAlertConditionGroup,
  type MetricAlertConditionOperator,
  type MetricAlertField
} from '../model/alert-rule-model';
import styles from '../shared/alert-rule-editor.module.css';

export type ConditionEditProps = {
  busy: boolean;
  root: MetricAlertConditionGroup;
  fields: MetricAlertField[];
  change: (condition: MetricAlertConditionGroup) => void;
};

type ConditionRowProps = ConditionEditProps & {
  condition: MetricAlertCondition;
  path: number[];
};

export function AlertRuleConditionRow(props: ConditionRowProps) {
  const { t } = useTranslation();
  const field = props.fields.find(item => item.value === props.condition.field);
  const operators = field ? metricAlertOperatorsForType(field.type) : [];
  return (
    <div className={styles.conditionRow}>
      <Select
        aria-label={t('alertRules.metricCondition.field')}
        disabled={props.busy}
        value={props.condition.field}
        options={props.fields.map(item => ({ value: item.value, label: item.label }))}
        onChange={value => props.change(changeMetricAlertConditionField(props.root, props.path, value, props.fields))}
      />
      <Select
        aria-label={t('alertRules.metricCondition.operator')}
        disabled={props.busy}
        value={props.condition.operator}
        options={operators.map(operator => ({
          value: operator,
          label: t(`alertRules.metricCondition.operators.${operator}`)
        }))}
        onChange={(operator: MetricAlertConditionOperator) =>
          props.change(changeMetricAlertConditionOperator(props.root, props.path, operator, props.fields))
        }
      />
      <ConditionValueInput {...props} field={field} />
      <RemoveConditionButton {...props} />
    </div>
  );
}

function ConditionValueInput(props: ConditionRowProps & { field: MetricAlertField | undefined }) {
  const { t } = useTranslation();
  const noValue = props.condition.operator === 'exists' || props.condition.operator === '!exists';
  if (noValue) return <span className={styles.conditionNoValue}>{t('alertRules.metricCondition.noValue')}</span>;

  const numeric = ['>', '<', '==', '!=', '<=', '>='].includes(props.condition.operator);
  if (numeric) {
    return (
      <InputNumber
        aria-label={t('alertRules.metricCondition.value')}
        disabled={props.busy}
        value={typeof props.condition.value === 'number' ? props.condition.value : null}
        addonAfter={props.field?.unit || undefined}
        onChange={value => props.change(updateMetricAlertConditionValue(props.root, props.path, value))}
      />
    );
  }
  return (
    <Input
      aria-label={t('alertRules.metricCondition.value')}
      disabled={props.busy}
      value={typeof props.condition.value === 'string' ? props.condition.value : ''}
      onChange={event => props.change(updateMetricAlertConditionValue(props.root, props.path, event.target.value))}
    />
  );
}

function RemoveConditionButton(props: ConditionRowProps) {
  const { t } = useTranslation();
  return (
    <Button
      aria-label={t('alertRules.metricCondition.remove')}
      type="text"
      danger
      icon={<DeleteOutlined />}
      disabled={props.busy}
      onClick={() => props.change(removeMetricAlertConditionItem(props.root, props.path))}
    />
  );
}
