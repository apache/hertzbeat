/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  addMetricAlertCondition,
  addMetricAlertConditionGroup,
  metricAlertConditionLimits,
  removeMetricAlertConditionItem,
  updateMetricAlertConditionGroupJoin,
  type MetricAlertConditionGroup
} from '../model/alert-rule-model';
import styles from '../shared/alert-rule-editor.module.css';
import { AlertRuleConditionRow, type ConditionEditProps } from './alert-rule-condition-row';

type ConditionGroupProps = ConditionEditProps & {
  group: MetricAlertConditionGroup;
  path: number[];
};

export function AlertRuleConditionGroup(props: ConditionGroupProps) {
  const { t } = useTranslation();
  const atLimit = props.group.items.length >= metricAlertConditionLimits.maximumItemsPerGroup;
  const canNest = props.path.length + 2 <= metricAlertConditionLimits.maximumDepth;
  return (
    <section className={styles.conditionGroup}>
      <header className={styles.conditionGroupHeader}>
        <Select
          aria-label={t('alertRules.metricCondition.join')}
          disabled={props.busy}
          value={props.group.join}
          options={['and', 'or'].map(value => ({
            value,
            label: t(`alertRules.metricCondition.${value}`)
          }))}
          onChange={join => props.change(updateMetricAlertConditionGroupJoin(props.root, props.path, join))}
        />
        <Button
          aria-label={t('alertRules.metricCondition.addCondition')}
          size="small"
          icon={<PlusOutlined />}
          disabled={props.busy || atLimit}
          onClick={() => props.change(addMetricAlertCondition(props.root, props.path, props.fields))}
        >
          {t('alertRules.metricCondition.addCondition')}
        </Button>
        <Button
          aria-label={t('alertRules.metricCondition.addGroup')}
          size="small"
          icon={<PlusOutlined />}
          disabled={props.busy || atLimit || !canNest}
          onClick={() => props.change(addMetricAlertConditionGroup(props.root, props.path, props.fields))}
        >
          {t('alertRules.metricCondition.addGroup')}
        </Button>
      </header>
      {props.group.items.length === 0 && (
        <div className={styles.conditionEmpty}>{t('alertRules.metricCondition.empty')}</div>
      )}
      {props.group.items.map((item, index) => {
        const itemPath = [...props.path, index];
        return item.kind === 'group' ? (
          <div className={styles.conditionNested} key={pathKey(itemPath)}>
            <AlertRuleConditionGroup {...props} group={item} path={itemPath} />
            <RemoveButton {...props} path={itemPath} />
          </div>
        ) : (
          <AlertRuleConditionRow {...props} condition={item} path={itemPath} key={pathKey(itemPath)} />
        );
      })}
    </section>
  );
}

function RemoveButton(props: ConditionGroupProps & { path: number[] }) {
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

function pathKey(path: number[]) {
  return path.join('.');
}
