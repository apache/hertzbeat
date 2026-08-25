/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Radio } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import alignmentStyles from '@/shared/horizontal-field/horizontal-field-alignment.module.css';

import {
  logAlertFields,
  parseMetricAlertCondition,
  serializeMetricAlertConditionAuthoring,
  type MetricAlertConditionGroup
} from '../model/alert-rule-model';
import styles from '../shared/alert-rule-editor.module.css';
import { AlertRuleConditionGroup } from './alert-rule-condition-group';
import { AlertRuleFieldLabel } from './alert-rule-field-label';
import { AlertRuleMetricExpressionEditor } from './alert-rule-metric-expression-editor';

const logExpressionMaximumLength = 200;

type LogConditionEditorProps = {
  busy: boolean;
  expression: string;
  mode: 'structured' | 'expert';
  change: (expression: string) => void;
  changeMode: (mode: 'structured' | 'expert', expression: string) => void;
};

/** Reproduces the 1.8.0 realtime-log visual/expression rule authoring surface. */
export function AlertRuleLogConditionEditor(props: LogConditionEditorProps) {
  const { t } = useTranslation();
  const initial = parseMetricAlertCondition(props.expression, logAlertFields);
  const [condition, setCondition] = useState<MetricAlertConditionGroup>(() => initial ?? emptyCondition());

  function changeStructured(next: MetricAlertConditionGroup) {
    setCondition(next);
    props.change(serializeMetricAlertConditionAuthoring(next, logAlertFields));
  }

  function changeMode(nextMode: 'structured' | 'expert') {
    if (nextMode === props.mode) return;
    if (nextMode === 'expert') {
      props.changeMode('expert', serializeMetricAlertConditionAuthoring(condition, logAlertFields));
      return;
    }
    const recovered = props.expression.trim()
      ? parseMetricAlertCondition(props.expression, logAlertFields)
      : emptyCondition();
    if (!recovered) return;
    setCondition(recovered);
    props.changeMode('structured', props.expression);
  }

  return (
    <>
      <div className={styles.conditionModeRow}>
        <AlertRuleFieldLabel
          className={styles.conditionModeLabel}
          help={t('alertRules.help.rule')}
          label={t('alertRules.metricCondition.rule')}
          required
        />
        <div className={`${styles.conditionModeControl} ${alignmentStyles.control} ${alignmentStyles.compactControl}`}>
          <div
            aria-label={t('alertRules.metricCondition.rule')}
            className={styles.conditionModeSelector}
            role="radiogroup"
          >
            <Radio.Group
              buttonStyle="solid"
              disabled={props.busy}
              optionType="button"
              size="small"
              value={props.mode}
              onChange={event => changeMode(event.target.value as 'structured' | 'expert')}
            >
              <Radio.Button value="structured">{t('alertRules.metricCondition.structured')}</Radio.Button>
              <Radio.Button value="expert">{t('alertRules.metricCondition.expert')}</Radio.Button>
            </Radio.Group>
          </div>
        </div>
      </div>
      <section aria-label={t('alertRules.metricCondition.title')} className={styles.conditionAuthoringRow}>
        <div className={styles.conditionAuthoringControl}>
          {props.mode === 'structured' ? (
            <AlertRuleConditionGroup
              busy={props.busy}
              root={condition}
              group={condition}
              path={[]}
              fields={logAlertFields}
              change={changeStructured}
            />
          ) : (
            <AlertRuleMetricExpressionEditor
              busy={props.busy}
              condition={props.expression}
              fields={logAlertFields}
              label={t('alertRules.logCondition.expression')}
              maximumLength={logExpressionMaximumLength}
              placeholder={t('alertRules.logCondition.expressionPlaceholder')}
              change={props.change}
            />
          )}
        </div>
      </section>
    </>
  );
}

function emptyCondition(): MetricAlertConditionGroup {
  return { kind: 'group', join: 'and', items: [] };
}
