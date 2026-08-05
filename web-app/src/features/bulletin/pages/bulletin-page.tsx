/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { OperationalPage, OperationalResultRegion } from '@/shared/operational-page';

import { BulletinEditor } from '../components/bulletin-editor';
import { BulletinPageControls } from '../components/bulletin-page-controls';
import { BulletinPageStatus } from '../components/bulletin-page-status';
import { BulletinWorkspace } from '../components/bulletin-workspace';
import { useBulletinController } from '../controller/bulletin-controller';

export function BulletinPage() {
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
        <BulletinWorkspace
          actions={actions}
          capabilities={state.capabilities}
          listKind={state.list.kind}
          metrics={state.metrics}
          query={state.query}
          readLocked={commandActive}
          records={records}
          selectedId={state.selectedId}
          selectedIds={state.selectedIds}
          total={state.list.kind === 'ready' ? state.list.total : 0}
          writeLocked={writeLocked}
        />
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
