/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { BulletinEditor } from '../components/bulletin-editor';
import { BulletinMetricsPanel } from '../components/bulletin-metrics';
import { BulletinPageControls } from '../components/bulletin-page-controls';
import { BulletinPageStatus } from '../components/bulletin-page-status';
import { BulletinTable } from '../components/bulletin-table';
import { useBulletinController } from '../controller/bulletin-controller';
import styles from '../bulletin-page.module.css';

export function BulletinPage() {
  const { t } = useTranslation();
  const { state, actions } = useBulletinController();
  const busy = state.command !== 'idle' || state.recovery !== null;
  const records = state.list.kind === 'ready' ? state.list.records : [];
  return (
    <div className={styles.page}>
      <BulletinPageControls
        actions={actions}
        busy={busy}
        capabilities={state.capabilities}
        refreshing={state.refreshing}
        search={state.search}
        selectedIds={state.selectedIds}
      />
      <BulletinPageStatus
        command={state.command}
        list={state.list}
        recovery={state.recovery}
        onRetry={() => void actions.retry()}
      />
      <BulletinTable
        actions={actions}
        busy={busy}
        capabilities={state.capabilities}
        listKind={state.list.kind}
        query={state.query}
        records={records}
        selectedId={state.selectedId}
        selectedIds={state.selectedIds}
        total={state.list.kind === 'ready' ? state.list.total : 0}
      />
      <section className={styles.metrics}>
        <Typography.Title level={3}>{t('bulletin.metrics.title')}</Typography.Title>
        <BulletinMetricsPanel state={state.metrics} />
      </section>
      {state.capabilities.canWrite && (
        <BulletinEditor
          draft={state.draft}
          dependencies={state.dependencies}
          saving={state.command === 'saving'}
          busy={busy}
          onClose={actions.close}
          onSave={() => void actions.save()}
          onChange={actions.updateDraft}
        />
      )}
    </div>
  );
}
