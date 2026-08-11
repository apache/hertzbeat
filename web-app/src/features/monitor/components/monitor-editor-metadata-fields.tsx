/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Input } from 'antd';
import { useTranslation } from 'react-i18next';

import type { MonitorParamDefine } from '../model/monitor-contract';
import type { MonitorEditorDraft, MonitorParamFormValue } from '../model/monitor-editor-model';
import type { MonitorEditorFieldLabels } from './monitor-editor-field-labels';
import type { MonitorEditorFormController } from './monitor-editor-form-model';
import { MonitorEditorFieldLabel } from './monitor-editor-field-label';
import { MonitorParamField } from './monitor-param-field';
import styles from './monitor-editor-form-view.module.css';

export function MonitorEditorMetadataFields({
  controller,
  draft,
  labels
}: {
  controller: MonitorEditorFormController;
  draft: MonitorEditorDraft;
  labels: MonitorEditorFieldLabels;
}) {
  const { t } = useTranslation();
  return (
    <>
      <MapMetadataField
        field="labels"
        label={t('monitor.editor.labels')}
        help={t('monitor.editor.labelsHelp')}
        value={draft.monitor.labels ?? null}
        controller={controller}
        labels={labels}
      />
      <MapMetadataField
        field="annotations"
        label={t('monitor.editor.annotations')}
        help={t('monitor.editor.annotationsHelp')}
        value={draft.monitor.annotations ?? null}
        controller={controller}
        labels={labels}
      />
      <label className={`${styles.formRow} ${styles.wide}`}>
        <MonitorEditorFieldLabel help={t('monitor.editor.descriptionHelp')}>
          {t('monitor.editor.descriptionLabel')}
        </MonitorEditorFieldLabel>
        <Input.TextArea
          rows={3}
          maxLength={100}
          showCount
          aria-label={t('monitor.editor.descriptionLabel')}
          value={draft.monitor.description ?? ''}
          disabled={controller.state.busy}
          onChange={event => controller.actions.updateMonitor({ description: event.target.value })}
        />
      </label>
    </>
  );
}

function MapMetadataField({
  field,
  label,
  help,
  value,
  controller,
  labels
}: {
  field: 'labels' | 'annotations';
  label: string;
  help: string;
  value: MonitorParamFormValue;
  controller: MonitorEditorFormController;
  labels: MonitorEditorFieldLabels;
}) {
  const issue = `param:__${field}`;
  return (
    <div className={controller.state.validationIssues.includes(issue) ? styles.fieldError : styles.field}>
      <MonitorParamField
        define={mapDefine(field)}
        label={<MonitorEditorFieldLabel help={help}>{label}</MonitorEditorFieldLabel>}
        className={styles.formRow}
        value={value}
        onChange={next => controller.actions.updateMonitor({ [field]: mapValue(next) })}
        onValidityChange={valid => controller.actions.setParamValid(`__${field}`, valid)}
        mapLabels={labels.map}
        {...(field === 'labels' && controller.state.labelSuggestions
          ? { mapSuggestions: controller.state.labelSuggestions }
          : {})}
        metricsLabels={labels.metrics}
        disabled={controller.state.busy}
      />
    </div>
  );
}

function mapDefine(field: string): MonitorParamDefine {
  return {
    id: null,
    app: 'monitor',
    field,
    name: { 'en-US': field },
    type: 'key-value',
    required: false,
    defaultValue: null,
    placeholder: null,
    range: null,
    limit: null,
    options: null,
    keyAlias: null,
    valueAlias: null,
    depend: null,
    hide: false
  };
}

function mapValue(value: MonitorParamFormValue) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}
