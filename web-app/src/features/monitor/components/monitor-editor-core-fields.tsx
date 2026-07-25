/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Input, InputNumber, Select } from 'antd';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import type { MonitorCollector } from '../model/monitor-contract';
import type { MonitorEditorDraft } from '../model/monitor-editor-model';
import { monitorIntervalBounds } from '../model/monitor-editor-validation';
import { monitorAppOptions } from '../model/monitor-model';
import type { MonitorEditorFormController } from './monitor-editor-form-model';

type CoreFieldProps = {
  mode: 'new' | 'edit';
  controller: MonitorEditorFormController;
  draft: MonitorEditorDraft;
};

export function MonitorEditorCoreFields(props: CoreFieldProps) {
  return (
    <>
      <MonitorSourceFields {...props} />
      <MonitorIdentityFields {...props} />
      <ScheduleFields
        draft={props.draft}
        issues={props.controller.state.validationIssues}
        disabled={props.controller.state.busy}
        update={props.controller.actions.updateMonitor}
      />
    </>
  );
}

function MonitorSourceFields({ mode, controller, draft }: CoreFieldProps) {
  const { t } = useTranslation();
  return (
    <>
      <label>
        {t('monitor.application')}
        <Select
          disabled={mode === 'edit' || controller.state.busy}
          showSearch
          optionFilterProp="label"
          value={draft.monitor.app || null}
          options={monitorAppOptions(controller.state.apps)}
          onChange={app => controller.actions.changeSource({ app, scrape: 'static' })}
        />
      </label>
      <label>
        {t('monitor.editor.scrape')}
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

function MonitorIdentityFields({ controller, draft }: CoreFieldProps) {
  const { t } = useTranslation();
  return (
    <>
      <label>
        {t('monitor.name')}
        <Input
          disabled={controller.state.busy}
          status={controller.state.validationIssues.includes('name') ? 'error' : ''}
          value={draft.monitor.name}
          onChange={event => controller.actions.updateMonitor({ name: event.target.value })}
        />
      </label>
      <label>
        {t('monitor.editor.collector')}
        <Select
          disabled={controller.state.busy}
          value={draft.collector}
          options={collectorOptions(controller.state.collectors, draft.collector, t)}
          onChange={controller.actions.updateCollector}
        />
      </label>
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
      <label>
        {t('monitor.editor.schedule')}
        <Select
          disabled={disabled}
          value={scheduleType}
          options={['interval', 'cron'].map(value => ({ value, label: t(`monitor.editor.scheduleTypes.${value}`) }))}
          onChange={next => update({ scheduleType: next, ...(next === 'interval' ? { cronExpression: null } : {}) })}
        />
      </label>
      {scheduleType === 'cron' ? (
        <label>
          {t('monitor.editor.cronExpression')}
          <Input
            disabled={disabled}
            status={issues.includes('cronExpression') ? 'error' : ''}
            value={draft.monitor.cronExpression ?? ''}
            onChange={event => update({ cronExpression: event.target.value })}
          />
        </label>
      ) : (
        <label>
          {t('monitor.editor.interval')}
          <InputNumber
            disabled={disabled}
            status={issues.includes('intervals') ? 'error' : ''}
            {...monitorIntervalBounds(draft.monitor.app)}
            value={draft.monitor.intervals ?? 60}
            onChange={intervals => update({ intervals })}
          />
        </label>
      )}
    </>
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
