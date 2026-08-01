/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useTranslation } from 'react-i18next';

import { OperationalPage, OperationalResultRegion, OperationalSection } from '@/shared/operational-page';

import { BulletinEditor } from '../components/bulletin-editor';
import { BulletinMetricsPanel } from '../components/bulletin-metrics';
import { BulletinPageControls } from '../components/bulletin-page-controls';
import { BulletinPageStatus } from '../components/bulletin-page-status';
import { BulletinTable } from '../components/bulletin-table';
import { useBulletinController } from '../controller/bulletin-controller';

export function BulletinPage() {
  const { t } = useTranslation();
  const { state, actions } = useBulletinController();
  const commandActive = state.command !== 'idle';
  const writeLocked = commandActive || state.recovery !== null;
  const records = state.list.kind === 'ready' ? state.list.records : [];
  return (
    <OperationalPage>
      <BulletinPageControls
        actions={actions}
        capabilities={state.capabilities}
        commandActive={commandActive}
        refreshing={state.refreshing}
        refreshSeconds={state.refreshSeconds}
        search={state.search}
        selectedIds={state.selectedIds}
        writeLocked={writeLocked}
      />
      <OperationalResultRegion>
        <BulletinPageStatus
          command={state.command}
          list={state.list}
          notice={state.notice}
          recovery={state.recovery}
          onDismissNotice={actions.dismissNotice}
          onRetry={() => void actions.retry()}
          onStopVerification={actions.stopVerification}
        />
        <BulletinTable
          actions={actions}
          capabilities={state.capabilities}
          listKind={state.list.kind}
          query={state.query}
          readLocked={commandActive}
          records={records}
          selectedId={state.selectedId}
          selectedIds={state.selectedIds}
          total={state.list.kind === 'ready' ? state.list.total : 0}
          writeLocked={writeLocked}
        />
        <OperationalSection title={t('bulletin.metrics.title')}>
          <BulletinMetricsPanel state={state.metrics} />
        </OperationalSection>
      </OperationalResultRegion>
      {state.capabilities.canWrite && (
        <BulletinEditor
          draft={state.draft}
          dependencies={state.dependencies}
          saving={state.command === 'saving'}
          writeLocked={writeLocked}
          onClose={actions.close}
          onSave={() => void actions.save()}
          onChange={actions.updateDraft}
        />
      )}
    </OperationalPage>
  );
}
