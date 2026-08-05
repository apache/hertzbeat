/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Input, InputNumber, Select } from 'antd';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import type { MonitorCollector } from '../model/monitor-contract';
import type { MonitorEditorDraft } from '../model/monitor-editor-model';
import { monitorIntervalBounds } from '../model/monitor-editor-validation';
import type { MonitorEditorFormController } from './monitor-editor-form-model';
import { MonitorEditorFieldLabel } from './monitor-editor-field-label';
import styles from './monitor-editor-form-view.module.css';

type CoreFieldProps = {
  mode: 'new' | 'edit';
  controller: MonitorEditorFormController;
  draft: MonitorEditorDraft;
  onChangeApplication: () => void;
};

export function MonitorEditorSourceFields({ mode, controller, draft, onChangeApplication }: CoreFieldProps) {
  const { t } = useTranslation();
  const application = controller.state.apps.find(item => item.value === draft.monitor.app)?.label ?? draft.monitor.app;
  return (
    <>
      <div className={`${styles.applicationField} ${styles.formRow}`}>
        <MonitorEditorFieldLabel required>{t('monitor.application')}</MonitorEditorFieldLabel>
        <div className={styles.applicationValue}>
          <strong>{application}</strong>
          {mode === 'new' ? (
            <Button type="link" disabled={controller.state.busy} onClick={onChangeApplication}>
              {t('monitor.appPicker.change')}
            </Button>
          ) : null}
        </div>
      </div>
      <label className={styles.formRow}>
        <MonitorEditorFieldLabel required>{t('monitor.editor.scrape')}</MonitorEditorFieldLabel>
        <Select
          disabled={controller.state.busy}
          value={draft.monitor.scrape ?? 'static'}
          options={controller.state.scrapeValues.map(value => ({
            value,
            label: t(`monitor.editor.scrapeTypes.${value}`)
          }))}
          onChange={scrape => controller.actions.changeSource({ scrape })}
        />
      </label>
    </>
  );
}

export function MonitorEditorNameField({ controller, draft }: Pick<CoreFieldProps, 'controller' | 'draft'>) {
  const { t } = useTranslation();
  return (
    <label className={styles.formRow}>
      <MonitorEditorFieldLabel required>{t('monitor.name')}</MonitorEditorFieldLabel>
      <Input
        aria-label={t('monitor.name')}
        disabled={controller.state.busy}
        status={controller.state.validationIssues.includes('name') ? 'error' : ''}
        value={draft.monitor.name}
        onChange={event => controller.actions.updateMonitor({ name: event.target.value })}
      />
      {controller.state.validationIssues.includes('name') ? (
        <span className={styles.fieldMessage} role="alert">
          {t('monitor.editor.invalidField')}
        </span>
      ) : null}
    </label>
  );
}

export function MonitorEditorCollectionFields({ controller, draft }: Pick<CoreFieldProps, 'controller' | 'draft'>) {
  const { t } = useTranslation();
  return (
    <>
      <label className={styles.formRow}>
        <MonitorEditorFieldLabel>{t('monitor.editor.collector')}</MonitorEditorFieldLabel>
        <Select
          disabled={controller.state.busy}
          value={draft.collector}
          options={collectorOptions(controller.state.collectors, draft.collector, t)}
          onChange={controller.actions.updateCollector}
        />
      </label>
      <ScheduleFields
        draft={draft}
        issues={controller.state.validationIssues}
        disabled={controller.state.busy}
        update={controller.actions.updateMonitor}
      />
    </>
  );
}

function ScheduleFields({
  draft,
  issues,
  disabled,
  update
}: {
  draft: MonitorEditorDraft;
  issues: string[];
  disabled: boolean;
  update: MonitorEditorFormController['actions']['updateMonitor'];
}) {
  const { t } = useTranslation();
  const scheduleType = draft.monitor.scheduleType ?? 'interval';
  return (
    <>
      <label className={styles.formRow}>
        <MonitorEditorFieldLabel>{t('monitor.editor.schedule')}</MonitorEditorFieldLabel>
        <Select
          disabled={disabled}
          value={scheduleType}
          options={['interval', 'cron'].map(value => ({ value, label: t(`monitor.editor.scheduleTypes.${value}`) }))}
          onChange={next => update({ scheduleType: next, ...(next === 'interval' ? { cronExpression: null } : {}) })}
        />
      </label>
      {scheduleType === 'cron' ? (
        <CronScheduleField draft={draft} issues={issues} disabled={disabled} update={update} />
      ) : (
        <IntervalScheduleField draft={draft} issues={issues} disabled={disabled} update={update} />
      )}
    </>
  );
}

type ScheduleValueProps = {
  draft: MonitorEditorDraft;
  issues: string[];
  disabled: boolean;
  update: MonitorEditorFormController['actions']['updateMonitor'];
};

function CronScheduleField({ draft, issues, disabled, update }: ScheduleValueProps) {
  const { t } = useTranslation();
  const invalid = issues.includes('cronExpression');
  return (
    <label className={styles.formRow}>
      <MonitorEditorFieldLabel required>{t('monitor.editor.cronExpression')}</MonitorEditorFieldLabel>
      <Input
        aria-label={t('monitor.editor.cronExpression')}
        disabled={disabled}
        status={invalid ? 'error' : ''}
        value={draft.monitor.cronExpression ?? ''}
        onChange={event => update({ cronExpression: event.target.value })}
      />
      {invalid ? <ScheduleFieldError /> : null}
    </label>
  );
}

function IntervalScheduleField({ draft, issues, disabled, update }: ScheduleValueProps) {
  const { t } = useTranslation();
  const invalid = issues.includes('intervals');
  return (
    <label className={`${styles.formRow} ${styles.compactField}`}>
      <MonitorEditorFieldLabel required>{t('monitor.editor.interval')}</MonitorEditorFieldLabel>
      <InputNumber
        aria-label={t('monitor.editor.interval')}
        disabled={disabled}
        status={invalid ? 'error' : ''}
        {...monitorIntervalBounds(draft.monitor.app)}
        value={draft.monitor.intervals ?? 60}
        onChange={intervals => update({ intervals })}
      />
      {invalid ? <ScheduleFieldError /> : null}
    </label>
  );
}

function ScheduleFieldError() {
  const { t } = useTranslation();
  return (
    <span className={styles.fieldMessage} role="alert">
      {t('monitor.editor.invalidField')}
    </span>
  );
}

function collectorOptions(collectors: MonitorCollector[], selected: string, t: TFunction) {
  const options = [
    { value: '', label: t('monitor.editor.collectorDefault') },
    ...collectors.map(item => ({
      value: item.name,
      label: item.online ? item.name : t('monitor.editor.collectorOffline', { name: item.name }),
      disabled: !item.online && item.name !== selected
    }))
  ];
  if (selected && !collectors.some(item => item.name === selected)) {
    options.push({ value: selected, label: t('monitor.editor.collectorMissing', { name: selected }), disabled: true });
  }
  return options;
}
