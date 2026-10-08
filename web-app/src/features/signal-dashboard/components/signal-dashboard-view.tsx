/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useState } from 'react';
import { Button, Popconfirm, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { saveBrowserDownload } from '@/shared/browser-download/browser-download';
import { OperationalPage, OperationalPageHeader } from '@/shared/operational-page';
import { readSignalDashboard } from '../model/signal-dashboard-record';
import type { DashboardViewProps } from '../model/signal-dashboard-view-model';
import { SignalDashboardDirectory } from './signal-dashboard-directory';
import { exportDashboardRecord } from '../model/signal-dashboard-download';
import { SignalDashboardQueryControls } from './signal-dashboard-query-controls';
import { SignalDashboardWorkspace } from './signal-dashboard-workspace';
import { SignalDashboardImport } from './signal-dashboard-import';
import styles from './signal-dashboard.module.css';

export function SignalDashboardView({ state, actions }: DashboardViewProps) {
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);
  return (
    <OperationalPage mode="workspace" inset="compact">
      <OperationalPageHeader
        title={state.document?.spec.display.name ?? t('signalDashboard.title')}
        description={t('signalDashboard.shared')}
        actions={<DashboardActions state={state} actions={actions} openImport={() => setImporting(true)} />}
      />
      {state.error && (
        <Typography.Paragraph type="danger" role="alert">
          {t(`signalDashboard.${state.error}`)}
        </Typography.Paragraph>
      )}
      {state.error === 'conflict' && (
        <Popconfirm title={t('signalDashboard.discardReload')} onConfirm={() => void actions.reload()}>
          <Button>{t('signalDashboard.reload')}</Button>
        </Popconfirm>
      )}
      {state.editor && (
        <Typography.Paragraph type="secondary">
          {t(state.editor.mode === 'upgrade' ? 'signalDashboard.upgradeExact' : 'signalDashboard.unsaved')}
        </Typography.Paragraph>
      )}
      {state.document ? (
        <>
          <SignalDashboardQueryControls state={state} actions={actions} />
          <SignalDashboardWorkspace state={state} actions={actions} />
        </>
      ) : (
        <DashboardReadState state={state} actions={actions} />
      )}
      {importing && (
        <SignalDashboardImport
          open={importing}
          close={() => setImporting(false)}
          submit={(text, copy) => {
            const valid = actions.importDocument(text, copy);
            if (valid) setImporting(false);
            return valid;
          }}
        />
      )}
    </OperationalPage>
  );
}

function DashboardActions({ state, actions, openImport }: DashboardViewProps & { openImport: () => void }) {
  const { t } = useTranslation();
  if (state.editor)
    return (
      <Space wrap>
        <Button disabled={state.busy} onClick={actions.cancel}>
          {t('common.cancel')}
        </Button>
        <Button
          disabled={state.busy || state.validationError || !state.canWrite}
          loading={state.busy}
          onClick={() => void actions.save()}
        >
          {t('common.save')}
        </Button>
      </Space>
    );
  return (
    <Space wrap>
      <Button onClick={actions.refreshDirectory}>{t('common.refresh')}</Button>
      {state.selectedKey && <Button onClick={() => actions.open()}>{t('signalDashboard.directory')}</Button>}
      {state.canWrite && (
        <>
          <Button onClick={() => actions.begin('new')}>{t('signalDashboard.new')}</Button>
          <Button onClick={openImport}>{t('signalDashboard.import')}</Button>
        </>
      )}
      {state.document && (
        <>
          {state.canWrite && (
            <>
              <Button onClick={() => actions.begin('edit')}>{t('signalDashboard.edit')}</Button>
              <Button onClick={() => actions.begin('copy')}>{t('signalDashboard.copy')}</Button>
            </>
          )}
          <Button
            onClick={() =>
              saveBrowserDownload({
                data: new Blob([JSON.stringify(state.document, null, 2)], { type: 'application/json' }),
                filename: `dashboard-${state.document!.metadata.name}.json`
              })
            }
          >
            {t('signalDashboard.export')}
          </Button>
        </>
      )}
      {state.active && state.canWrite && (
        <Popconfirm title={t('signalDashboard.deleteConfirm')} onConfirm={() => void actions.remove(state.active!)}>
          <Button danger disabled={state.busy || state.active.revision == null}>
            {t('common.delete')}
          </Button>
        </Popconfirm>
      )}
    </Space>
  );
}

function DashboardReadState({ state, actions }: DashboardViewProps) {
  const { t } = useTranslation();
  const read = state.active ? readSignalDashboard(state.active) : undefined;
  const label = dashboardReadLabel(state.listState, read);
  if (state.selectedKey)
    return (
      <section className={styles.readState}>
        <Typography.Paragraph role={state.listState === 'error' ? 'alert' : 'status'}>
          {t(`signalDashboard.${label}`)}
        </Typography.Paragraph>
        {state.active && (
          <Button onClick={() => exportDashboardRecord(state.active!)}>{t('signalDashboard.exportOriginal')}</Button>
        )}
        {read?.kind === 'legacy' && read.document && state.canWrite && (
          <Button onClick={() => actions.begin('upgrade')}>{t('signalDashboard.upgrade')}</Button>
        )}
      </section>
    );
  return (
    <>
      {state.incoming && (
        <section className={styles.incoming}>
          <strong>{t('signalDashboard.chooseTarget')}</strong>
          <Typography.Paragraph>{t('signalDashboard.addSourceWindow')}</Typography.Paragraph>
          <Space wrap>
            <Button disabled={!state.canWrite} onClick={() => actions.receive()}>
              {t('signalDashboard.newFromPanel')}
            </Button>
            <Button onClick={actions.dismissIncoming}>{t('common.cancel')}</Button>
            <a href={state.incoming.returnTo}>{t('signalDashboard.returnSource')}</a>
          </Space>
        </section>
      )}
      <SignalDashboardDirectory state={state} actions={actions} />
    </>
  );
}

function dashboardReadLabel(
  state: DashboardViewProps['state']['listState'],
  read: ReturnType<typeof readSignalDashboard> | undefined
) {
  return state === 'ready' ? (read?.kind ?? 'unavailable') : state;
}
