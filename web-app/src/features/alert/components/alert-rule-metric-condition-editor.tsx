/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Radio } from 'antd';
import { useTranslation } from 'react-i18next';

import alignmentStyles from '@/shared/horizontal-field/horizontal-field-alignment.module.css';

import {
  type AlertRuleDraft,
  type MetricAlertAuthoring,
  type MetricAlertConditionGroup,
  type MetricAlertField
} from '../model/alert-rule-model';
import styles from '../shared/alert-rule-editor.module.css';
import { AlertRuleConditionGroup } from './alert-rule-condition-group';
import { AlertRuleFieldLabel } from './alert-rule-field-label';
import { AlertRuleMetricExpressionEditor } from './alert-rule-metric-expression-editor';

type MetricConditionEditorProps = {
  busy: boolean;
  draft: AlertRuleDraft;
  fields: MetricAlertField[];
  changeStructured: (condition: MetricAlertConditionGroup) => void;
  changeExpert: (condition: string) => void;
  changeMode: (mode: MetricAlertAuthoring['mode']) => void;
};

/** Edits only the threshold; reserved target clauses remain model-owned. */
export function AlertRuleMetricConditionEditor(props: MetricConditionEditorProps) {
  const { t } = useTranslation();
  const context = metricConditionEditorContext(props.draft);
  if (!context) return null;
  const { editor } = context;
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
              value={editor.authoring.mode}
              onChange={event => props.changeMode(event.target.value as MetricAlertAuthoring['mode'])}
            >
              <Radio.Button value="structured">{t('alertRules.metricCondition.structured')}</Radio.Button>
              <Radio.Button value="expert">{t('alertRules.metricCondition.expert')}</Radio.Button>
            </Radio.Group>
          </div>
        </div>
      </div>
      <section aria-label={t('alertRules.metricCondition.title')} className={styles.conditionAuthoringRow}>
        <div className={styles.conditionAuthoringControl}>
          <MetricConditionAuthoring {...props} editor={editor} />
        </div>
      </section>
    </>
  );
}

type TargetedMetricEditor = Extract<NonNullable<AlertRuleDraft['metricEditor']>, { kind: 'targeted' }>;

function metricConditionEditorContext(draft: AlertRuleDraft) {
  const editor = draft.metricEditor;
  if (editor?.kind !== 'targeted' || editor.target?.kind !== 'metric') return null;
  return {
    editor
  };
}

function MetricConditionAuthoring(props: MetricConditionEditorProps & { editor: TargetedMetricEditor }) {
  if (props.editor.authoring.mode === 'structured') {
    return (
      <AlertRuleConditionGroup
        busy={props.busy}
        root={props.editor.authoring.condition}
        group={props.editor.authoring.condition}
        path={[]}
        fields={props.fields}
        change={props.changeStructured}
      />
    );
  }
  return (
    <AlertRuleMetricExpressionEditor
      busy={props.busy}
      condition={props.editor.authoring.condition}
      fields={props.fields}
      change={props.changeExpert}
    />
  );
}
