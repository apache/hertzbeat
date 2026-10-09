/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useState } from 'react';
import { Button, Input, InputNumber, Select, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { HertzBeatDashboardDocument } from '@/platform/perses';
import { globalTimeRanges } from '@/shared/time';
import { removeDashboardPanel, updateDashboardLayout } from '../model/signal-dashboard-authoring';
import type { DashboardViewProps } from '../model/signal-dashboard-view-model';
import { SignalDashboardPanelEditor } from './signal-dashboard-panel-editor';
import { SignalDashboardVariablesEditor } from './signal-dashboard-variables-editor';
import styles from './signal-dashboard.module.css';

export function SignalDashboardDefinition({
  state,
  actions,
  panelId
}: DashboardViewProps & { panelId: string | undefined }) {
  const { t } = useTranslation();
  const document = state.document!;
  const update = (change: (next: HertzBeatDashboardDocument) => void) => {
    const next = structuredClone(document);
    change(next);
    actions.update(next);
  };
  const disabled = state.busy || state.editor?.mode === 'upgrade';
  return (
    <fieldset className={styles.fields} disabled={disabled}>
      <legend>{t('signalDashboard.definition')}</legend>
      <label>
        {t('signalDashboard.name')}
        <Input
          aria-label={t('signalDashboard.name')}
          value={document.spec.display.name}
          maxLength={255}
          onChange={event =>
            update(next => {
              next.spec.display.name = event.target.value;
            })
          }
        />
      </label>
      <details>
        <summary>{t('signalDashboard.settings')}</summary>
        <div className={styles.fields}>
          <label>
            {t('signalDashboard.description')}
            <Input.TextArea
              aria-label={t('signalDashboard.description')}
              value={document.spec.display.description ?? ''}
              maxLength={512}
              onChange={event =>
                update(next => {
                  next.spec.display.description = event.target.value;
                })
              }
            />
          </label>
          <div>
            {t('signalDashboard.key')}: <code>{document.metadata.name}</code>
          </div>
          <DashboardDefaults document={document} timeZone={state.timeZone} disabled={disabled} update={update} />
          <SignalDashboardVariablesEditor document={document} update={actions.update} disabled={disabled} />
        </div>
      </details>
      {panelId && (
        <SelectedPanelDefinition document={document} panelId={panelId} update={actions.update} disabled={disabled} />
      )}
    </fieldset>
  );
}

function DashboardLayoutControls({
  document,
  panelId,
  update
}: {
  document: HertzBeatDashboardDocument;
  panelId: string;
  update: (document: HertzBeatDashboardDocument) => void;
}) {
  const { t } = useTranslation();
  const [invalid, setInvalid] = useState(false);
  const index = document.spec.layouts[0].spec.items.findIndex(item => item.content.$ref === '#/spec/panels/' + panelId);
  const item = document.spec.layouts[0].spec.items[index]!;
  return (
    <fieldset className={styles.layoutFields}>
      <legend>{t('signalDashboard.layout')}</legend>
      {invalid && (
        <Typography.Paragraph type="danger" role="alert">
          {t('signalDashboard.invalidLayout')}
        </Typography.Paragraph>
      )}
      {(['x', 'y', 'width', 'height'] as const).map(field => (
        <label key={field}>
          {t('signalDashboard.' + field)}
          <InputNumber
            aria-label={t('signalDashboard.' + field)}
            value={item[field]}
            min={field === 'width' || field === 'height' ? 1 : 0}
            max={field === 'y' ? 1000 : field === 'height' ? 100 : field === 'x' ? 23 : 24}
            onChange={value => {
              if (value == null) return;
              const items = structuredClone(document.spec.layouts[0].spec.items);
              items[index]![field] = value;
              try {
                update(updateDashboardLayout(document, items));
                setInvalid(false);
              } catch {
                setInvalid(true);
              }
            }}
          />
        </label>
      ))}
    </fieldset>
  );
}

function DashboardDefaults({
  document,
  timeZone,
  disabled,
  update
}: {
  document: HertzBeatDashboardDocument;
  timeZone: string;
  disabled: boolean;
  update: (change: (document: HertzBeatDashboardDocument) => void) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      {' '}
      <label>
        {t('signalDashboard.defaultDuration')}
        <Select
          disabled={disabled}
          value={document.spec.duration}
          options={globalTimeRanges.map(value => ({ value, label: value }))}
          onChange={duration =>
            update(next => {
              next.spec.duration = duration;
            })
          }
        />
      </label>
      <label>
        {t('signalDashboard.autoRefresh')}
        <Select
          disabled={disabled}
          value={document.spec.refreshInterval ?? '0s'}
          options={['0s', '30s', '1m'].map(value => ({ value, label: value }))}
          onChange={value =>
            update(next => {
              next.spec.refreshInterval = value;
            })
          }
        />
      </label>
      <label>
        {t('signalDashboard.timeZone')}
        <Input
          value={document.spec.timezone ?? ''}
          placeholder={timeZone}
          onChange={event =>
            update(next => {
              if (event.target.value) next.spec.timezone = event.target.value;
              else delete next.spec.timezone;
            })
          }
        />
      </label>
    </>
  );
}

function SelectedPanelDefinition({
  document,
  panelId,
  update,
  disabled
}: {
  document: HertzBeatDashboardDocument;
  panelId: string;
  update: (document: HertzBeatDashboardDocument) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  return (
    <>
      <SignalDashboardPanelEditor document={document} panelId={panelId} update={update} disabled={disabled} />
      <DashboardLayoutControls document={document} panelId={panelId} update={update} />
      <Button danger disabled={disabled} onClick={() => update(removeDashboardPanel(document, panelId))}>
        {t('signalDashboard.removePanel')}
      </Button>
    </>
  );
}
