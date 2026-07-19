/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Collapse } from 'antd';
import { useTranslation } from 'react-i18next';

import type { MonitorParamDefine } from '../model/monitor-contract';
import { groupMonitorParamDefines, isMonitorParamVisible } from '../model/monitor-editor-draft';
import type { MonitorEditorDraft } from '../model/monitor-editor-model';
import type { MonitorEditorFieldLabels } from './monitor-editor-field-labels';
import type { MonitorEditorFormController } from './monitor-editor-form-model';
import { MonitorParamField } from './monitor-param-field';
import styles from './monitor-editor-form-view.module.css';

type ParamContext = {
  draft: MonitorEditorDraft;
  controller: MonitorEditorFormController;
  validationIssues: string[];
  language: string;
  labels: MonitorEditorFieldLabels;
};

export function MonitorEditorParamSections({ context }: { context: ParamContext }) {
  const groups = groupMonitorParamDefines(context.controller.state.defines);
  return (
    <>
      {groups.basic.map(define => renderParamField(define, context))}
      <AdvancedFields defines={groups.advanced} context={context} />
    </>
  );
}

function renderParamField(define: MonitorParamDefine, context: ParamContext) {
  if (!isMonitorParamVisible(define, context.draft.params)) return null;
  const param = context.draft.params.find(item => item.field === define.field);
  if (!param) return null;
  const invalid = context.validationIssues.includes(`param:${define.field}`);
  return (
    <div
      key={`${context.controller.state.sourceKey}:${define.field}`}
      aria-invalid={invalid}
      className={invalid ? styles.fieldError : styles.field}
    >
      <MonitorParamField
        define={define}
        value={param.paramValue}
        label={define.name[context.language] ?? define.name['en-US'] ?? define.field}
        onChange={value => context.controller.actions.updateParam(define.field, value)}
        onValidityChange={valid => context.controller.actions.setParamValid(define.field, valid)}
        mapLabels={context.labels.map}
        metricsLabels={context.labels.metrics}
        disabled={context.controller.state.busy}
      />
    </div>
  );
}

function AdvancedFields({ defines, context }: { defines: MonitorParamDefine[]; context: ParamContext }) {
  const { t } = useTranslation();
  if (defines.length === 0) return null;
  return (
    <Collapse
      className={styles.wide ?? ''}
      items={[
        {
          key: 'advanced',
          label: t('monitor.editor.advanced'),
          children: <div className={styles.form}>{defines.map(define => renderParamField(define, context))}</div>
        }
      ]}
    />
  );
}
