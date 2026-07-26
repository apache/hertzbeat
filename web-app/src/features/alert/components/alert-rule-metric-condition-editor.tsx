/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Input, Space } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  parseMetricAlertCondition,
  serializeCompleteMetricAlertCondition,
  type AlertRuleDraft,
  type MetricAlertAuthoring,
  type MetricAlertConditionGroup,
  type MetricAlertField
} from '../model/alert-rule-model';
import styles from '../shared/alert-rule-editor.module.css';
import { AlertRuleConditionGroup } from './alert-rule-condition-group';

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
  const context = metricConditionEditorContext(props.draft, props.fields);
  if (!context) return null;
  const { canStructure, canUseExpert, editor } = context;
  return (
    <section className={`${styles.wide} ${styles.conditionEditor}`}>
      <header className={styles.conditionEditorHeader}>
        <span>{t('alertRules.metricCondition.title')}</span>
        <Space.Compact>
          <Button
            size="small"
            type={editor.authoring.mode === 'structured' ? 'primary' : 'default'}
            disabled={props.busy || !canStructure}
            onClick={() => props.changeMode('structured')}
          >
            {t('alertRules.metricCondition.structured')}
          </Button>
          <Button
            size="small"
            type={editor.authoring.mode === 'expert' ? 'primary' : 'default'}
            disabled={props.busy || !canUseExpert}
            onClick={() => props.changeMode('expert')}
          >
            {t('alertRules.metricCondition.expert')}
          </Button>
        </Space.Compact>
      </header>
      <MetricConditionAuthoring {...props} editor={editor} canStructure={canStructure} />
    </section>
  );
}

type TargetedMetricEditor = Extract<NonNullable<AlertRuleDraft['metricEditor']>, { kind: 'targeted' }>;

function metricConditionEditorContext(draft: AlertRuleDraft, fields: MetricAlertField[]) {
  const editor = draft.metricEditor;
  if (editor?.kind !== 'targeted' || editor.target?.kind !== 'metric') return null;
  return {
    editor,
    canStructure:
      editor.authoring.mode === 'structured' || parseMetricAlertCondition(editor.authoring.condition, fields) !== null,
    canUseExpert:
      editor.authoring.mode === 'expert' ||
      serializeCompleteMetricAlertCondition(editor.authoring.condition, fields) !== null
  };
}

function MetricConditionAuthoring(
  props: MetricConditionEditorProps & { editor: TargetedMetricEditor; canStructure: boolean }
) {
  const { t } = useTranslation();
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
    <>
      {!props.canStructure && <Alert type="warning" showIcon message={t('alertRules.metricCondition.expertOnly')} />}
      <label className={styles.conditionExpert}>
        {t('alertRules.metricCondition.expertExpression')}
        <Input.TextArea
          aria-label={t('alertRules.metricCondition.expertExpression')}
          disabled={props.busy}
          rows={4}
          value={props.editor.authoring.condition}
          onChange={event => props.changeExpert(event.target.value)}
        />
      </label>
    </>
  );
}
