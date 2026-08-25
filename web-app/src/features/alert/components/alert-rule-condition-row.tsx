/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { MinusOutlined } from '@ant-design/icons';
import { Button, Input, InputNumber, Select, Tag } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  changeMetricAlertConditionField,
  changeMetricAlertConditionOperator,
  isMetricAlertAttribute,
  metricAlertFieldTypeKey,
  metricAlertOperatorsForType,
  removeMetricAlertConditionItem,
  resolveMetricAlertField,
  updateMetricAlertConditionAttribute,
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
  const resolved = resolveMetricAlertField(props.fields, props.condition.field);
  const field = resolved?.field;
  const operators = field ? metricAlertOperatorsForType(field.type) : [];
  const acceptsAttribute = field?.acceptsAttribute === true;
  return (
    <div
      className={acceptsAttribute ? `${styles.conditionRow} ${styles.conditionRowWithAttribute}` : styles.conditionRow}
    >
      <div
        className={
          acceptsAttribute
            ? `${styles.conditionFieldControl} ${styles.conditionFieldControlWithAttribute}`
            : styles.conditionFieldControl
        }
      >
        <Select<string>
          aria-label={t('alertRules.metricCondition.field')}
          disabled={props.busy}
          value={field?.value ?? null}
          options={props.fields.map(item => ({ value: item.value, label: item.label }))}
          optionRender={option => {
            const optionField = props.fields.find(item => item.value === option.value);
            if (!optionField) return option.label;
            return (
              <div className={styles.conditionFieldOption}>
                <span>{optionField.label}</span>
                <span className={styles.conditionFieldMeta}>
                  <Tag>
                    {t(`alertRules.metricCondition.expressionTypes.${metricAlertFieldTypeKey(optionField.type)}`)}
                  </Tag>
                  {optionField.unit && <Tag>{optionField.unit}</Tag>}
                </span>
              </div>
            );
          }}
          popupMatchSelectWidth={false}
          onChange={value => props.change(changeMetricAlertConditionField(props.root, props.path, value, props.fields))}
        />
        {acceptsAttribute && (
          <div className={styles.conditionAttribute}>
            <span aria-hidden="true">.</span>
            <Input
              aria-label={t('alertRules.metricCondition.objectAttribute')}
              disabled={props.busy}
              placeholder={t('alertRules.metricCondition.objectAttributePlaceholder')}
              value={resolved?.attribute ?? ''}
              onChange={event => {
                const attribute = event.target.value;
                if (attribute && !isMetricAlertAttribute(attribute)) return;
                props.change(updateMetricAlertConditionAttribute(props.root, props.path, attribute, props.fields));
              }}
            />
          </div>
        )}
      </div>
      <Select
        aria-label={t('alertRules.metricCondition.operator')}
        className={styles.conditionOperator!}
        disabled={props.busy}
        value={props.condition.operator}
        options={operators.map(operator => ({
          value: operator,
          label: t(`alertRules.metricCondition.operators.${operator}`)
        }))}
        popupMatchSelectWidth={false}
        suffixIcon={null}
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
        placeholder={t('alertRules.metricCondition.numberPlaceholder')}
        value={typeof props.condition.value === 'number' ? props.condition.value : null}
        onChange={value => props.change(updateMetricAlertConditionValue(props.root, props.path, value))}
      />
    );
  }
  return (
    <Input
      aria-label={t('alertRules.metricCondition.value')}
      disabled={props.busy}
      placeholder={t('alertRules.metricCondition.stringPlaceholder')}
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
      className={styles.conditionRemove!}
      danger
      icon={<MinusOutlined />}
      disabled={props.busy}
      onClick={() => props.change(removeMetricAlertConditionItem(props.root, props.path))}
    />
  );
}
