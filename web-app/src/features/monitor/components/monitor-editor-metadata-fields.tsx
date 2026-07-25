/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Input } from 'antd';
import { useTranslation } from 'react-i18next';

import type { MonitorParamDefine } from '../model/monitor-contract';
import type { MonitorEditorDraft, MonitorParamFormValue } from '../model/monitor-editor-model';
import type { MonitorEditorFieldLabels } from './monitor-editor-field-labels';
import type { MonitorEditorFormController } from './monitor-editor-form-model';
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
        value={draft.monitor.labels ?? null}
        controller={controller}
        labels={labels}
      />
      <MapMetadataField
        field="annotations"
        label={t('monitor.editor.annotations')}
        value={draft.monitor.annotations ?? null}
        controller={controller}
        labels={labels}
      />
      <label className={styles.wide}>
        {t('monitor.editor.descriptionLabel')}
        <Input.TextArea
          rows={3}
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
  value,
  controller,
  labels
}: {
  field: 'labels' | 'annotations';
  label: string;
  value: MonitorParamFormValue;
  controller: MonitorEditorFormController;
  labels: MonitorEditorFieldLabels;
}) {
  const issue = `param:__${field}`;
  return (
    <div className={controller.state.validationIssues.includes(issue) ? styles.fieldError : styles.field}>
      <MonitorParamField
        define={mapDefine(field)}
        label={label}
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
