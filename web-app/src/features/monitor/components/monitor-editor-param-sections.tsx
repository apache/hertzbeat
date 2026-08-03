/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Collapse } from 'antd';
import { useTranslation } from 'react-i18next';

import type { MonitorParamDefine } from '../model/monitor-contract';
import { groupMonitorParamDefines, isMonitorParamVisible } from '../model/monitor-editor-draft';
import type { MonitorEditorDraft } from '../model/monitor-editor-model';
import type { MonitorEditorFieldLabels } from './monitor-editor-field-labels';
import type { MonitorEditorFormController } from './monitor-editor-form-model';
import { MonitorEditorFieldLabel } from './monitor-editor-field-label';
import { MonitorParamField } from './monitor-param-field';
import styles from './monitor-editor-form-view.module.css';

type ParamContext = {
  draft: MonitorEditorDraft;
  controller: MonitorEditorFormController;
  validationIssues: string[];
  language: string;
  labels: MonitorEditorFieldLabels;
  invalidMessage: string;
};

/**
 * Discovery parameters describe how targets are located, so they belong next
 * to the discovery selector even when the backend marks credentials as hidden.
 * For discovery definitions, `hide` is presentation metadata from the generic
 * definition contract; dependency rules still decide whether a field is shown.
 */
export function MonitorEditorDiscoveryParams({ context }: { context: ParamContext }) {
  const scrape = context.draft.monitor.scrape ?? 'static';
  if (scrape === 'static') return null;
  const defines = context.controller.state.defines.filter(define => belongsToSource(define, scrape));
  return <>{defines.map(define => renderParamField(define, context))}</>;
}

export function MonitorEditorApplicationParams({ context }: { context: ParamContext }) {
  const applicationDefines = context.controller.state.defines.filter(define =>
    belongsToSource(define, context.draft.monitor.app)
  );
  const groups = groupMonitorParamDefines(applicationDefines);
  return (
    <>
      {groups.basic.filter(define => define.field !== 'host').map(define => renderParamField(define, context))}
      <AdvancedFields defines={groups.advanced.filter(define => define.field !== 'host')} context={context} />
    </>
  );
}

/**
 * Static monitors keep their primary endpoint before the monitor name, matching
 * the established authoring order. Discovery modes own their endpoint fields.
 */
export function MonitorEditorHostParam({ context }: { context: ParamContext }) {
  if ((context.draft.monitor.scrape ?? 'static') !== 'static') return null;
  const host = context.controller.state.defines.find(define => define.field === 'host');
  return host ? renderParamField(host, context) : null;
}

function renderParamField(define: MonitorParamDefine, context: ParamContext) {
  if (!isMonitorParamVisible(define, context.draft.params)) return null;
  const param = context.draft.params.find(item => item.field === define.field);
  if (!param) return null;
  const invalid = context.validationIssues.includes(`param:${define.field}`);
  const label = define.name[context.language] ?? define.name['en-US'] ?? define.field;
  return (
    <div
      key={`${context.controller.state.sourceKey}:${define.field}`}
      aria-invalid={invalid}
      className={invalid ? styles.fieldError : styles.field}
    >
      <MonitorParamField
        define={define}
        className={styles.formRow}
        value={param.paramValue}
        label={<MonitorEditorFieldLabel required={define.required}>{label}</MonitorEditorFieldLabel>}
        ariaLabel={label}
        invalid={invalid}
        onChange={value => context.controller.actions.updateParam(define.field, value)}
        onValidityChange={valid => context.controller.actions.setParamValid(define.field, valid)}
        mapLabels={context.labels.map}
        metricsLabels={context.labels.metrics}
        disabled={context.controller.state.busy}
      />
      {invalid ? (
        <span className={styles.fieldMessage} role="alert">
          {context.invalidMessage}
        </span>
      ) : null}
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
          children: (
            <div className={`${styles.formRail} ${styles.form}`}>
              {defines.map(define => renderParamField(define, context))}
            </div>
          )
        }
      ]}
    />
  );
}

function belongsToSource(define: MonitorParamDefine, source: string) {
  return define.app.toLowerCase() === source.toLowerCase();
}
