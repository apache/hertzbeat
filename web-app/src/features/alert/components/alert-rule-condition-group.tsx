/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Radio } from 'antd';
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
        <Radio.Group
          aria-label={t('alertRules.metricCondition.join')}
          buttonStyle="solid"
          disabled={props.busy}
          optionType="button"
          size="small"
          value={props.group.join}
          onChange={event =>
            props.change(
              updateMetricAlertConditionGroupJoin(
                props.root,
                props.path,
                event.target.value as MetricAlertConditionGroup['join']
              )
            )
          }
        >
          <Radio.Button value="and">{t('alertRules.metricCondition.and')}</Radio.Button>
          <Radio.Button value="or">{t('alertRules.metricCondition.or')}</Radio.Button>
        </Radio.Group>
        <div className={styles.conditionGroupActions}>
          <Button
            aria-label={t('alertRules.metricCondition.addCondition')}
            size="small"
            icon={<PlusOutlined />}
            disabled={props.busy || atLimit}
            onClick={() => props.change(addMetricAlertCondition(props.root, props.path, props.fields))}
          >
            {t('alertRules.metricCondition.ruleButton')}
          </Button>
          <Button
            aria-label={t('alertRules.metricCondition.addGroup')}
            size="small"
            icon={<PlusOutlined />}
            disabled={props.busy || atLimit || !canNest}
            onClick={() => props.change(addMetricAlertConditionGroup(props.root, props.path))}
          >
            {t('alertRules.metricCondition.rulesetButton')}
          </Button>
        </div>
      </header>
      {props.path.length > 0 && props.group.items.length === 0 && (
        <div className={styles.conditionEmpty}>{t('alertRules.metricCondition.emptyGroup')}</div>
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
      danger
      icon={<MinusOutlined />}
      disabled={props.busy}
      onClick={() => props.change(removeMetricAlertConditionItem(props.root, props.path))}
    />
  );
}

function pathKey(path: number[]) {
  return path.join('.');
}
