/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useState } from 'react';
import { Button, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { DashboardViewProps } from '../model/signal-dashboard-view-model';
import { addEmptyDashboardPanel } from '../model/signal-dashboard-panels';
import { SignalDashboardDefinition } from './signal-dashboard-definition';
import { SignalDashboardGrid } from './signal-dashboard-grid';
import styles from './signal-dashboard.module.css';

export function SignalDashboardWorkspace({ state, actions }: DashboardViewProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string>();
  const ids = Object.keys(state.document?.spec.panels ?? {});
  const panelId = selected && ids.includes(selected) ? selected : ids[0];
  return (
    <div className={state.editor ? styles.editorWorkspace : styles.workspace}>
      {state.editor && (
        <aside className={styles.definition}>
          <SignalDashboardDefinition state={state} actions={actions} panelId={panelId} />
          <Button
            disabled={state.busy || state.editor.mode === 'upgrade' || ids.length >= 24}
            onClick={() => {
              const id = crypto.randomUUID();
              actions.update(addEmptyDashboardPanel(state.document!, id, t('signalDashboard.newPanel')));
              setSelected(id);
            }}
          >
            {t('signalDashboard.addPanel')}
          </Button>
          {state.validationError && (
            <Typography.Paragraph role="alert" type="danger">
              {t('signalDashboard.invalidDocument')}
            </Typography.Paragraph>
          )}
        </aside>
      )}
      <section className={styles.gridHost} aria-label={t('signalDashboard.panels')}>
        {ids.length ? (
          <SignalDashboardGrid state={state} actions={actions} select={setSelected} selected={panelId} />
        ) : (
          <Typography.Paragraph>{t('signalDashboard.noPanels')}</Typography.Paragraph>
        )}
      </section>
    </div>
  );
}
