/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalPage, OperationalResultRegion } from '@/shared/operational-page';

import { NoticeRuleDetailEvidence } from '../components/notice-rule-detail-evidence';
import { NoticeRuleEditor } from '../components/notice-rule-editor';
import { NoticeRuleTable } from '../components/notice-rule-table';
import { NoticeRuleToolbar } from '../components/notice-rule-toolbar';
import { NoticeRuleRecovery } from '../components/notice-rule-recovery';
import { useNoticeRuleController } from '../controller/notice-rule-controller';

type OptionKind = 'loading' | 'ready' | 'empty' | 'invalid' | 'unavailable' | 'error';

function optionAlert(kind: OptionKind) {
  if (kind === 'ready' || kind === 'loading') return null;
  const type = kind === 'empty' ? 'info' : 'warning';
  return { messageKey: `noticeRules.options.${kind}`, type } as const;
}

export function NoticeRulePage() {
  const { t } = useTranslation();
  const controller = useNoticeRuleController();
  const { state, actions } = controller;
  const alert = optionAlert(state.options.kind);
  const busy = state.command !== 'idle';
  const dependenciesReady = state.options.kind === 'ready';
  const editorRecovery =
    state.recovery?.kind === 'create' || state.recovery?.kind === 'update' ? state.recovery : undefined;
  const routeRecovery = editorRecovery ? undefined : state.recovery;
  const tableActions = {
    changePage: actions.changePage,
    edit: (id: number) => void actions.edit(id),
    remove: actions.remove,
    toggle: actions.toggle
  };
  return (
    <OperationalPage>
      <NoticeRuleToolbar
        name={state.name}
        canCreate={state.capabilities.canCreate}
        busy={busy}
        refreshing={state.refreshing}
        createDisabled={!dependenciesReady || busy || state.refreshing}
        onNameChange={actions.setName}
        onQuery={actions.search}
        onRefresh={() => void actions.refresh()}
        onCreate={actions.create}
      />
      <OperationalResultRegion>
        {alert ? <Alert type={alert.type} showIcon message={t(alert.messageKey)} /> : null}
        <NoticeRuleDetailEvidence state={state.detail} busy={busy} retry={actions.retryDetail} />
        <NoticeRuleRecovery
          recovery={routeRecovery}
          canRetry={state.canRetryOperation}
          retryBusy={state.command !== 'recovering'}
          retry={actions.retry}
        />
        <NoticeRuleTable
          actions={tableActions}
          busy={busy || state.refreshing}
          capabilities={state.capabilities}
          dependenciesReady={dependenciesReady}
          state={state.list}
          pageIndex={state.query.pageIndex}
          pageSize={state.query.pageSize}
          togglingRuleId={state.togglingRuleId}
        />
      </OperationalResultRegion>
      <NoticeRuleEditorBoundary
        controller={controller}
        dependenciesReady={dependenciesReady}
        recovery={editorRecovery}
      />
    </OperationalPage>
  );
}

function NoticeRuleEditorBoundary({
  controller,
  dependenciesReady,
  recovery
}: {
  controller: ReturnType<typeof useNoticeRuleController>;
  dependenciesReady: boolean;
  recovery: ReturnType<typeof useNoticeRuleController>['state']['recovery'];
}) {
  const { state, actions } = controller;
  if (!state.draft || !state.canSubmitDraft) return null;
  return (
    <NoticeRuleEditor
      draft={state.draft}
      receivers={state.receivers}
      templates={state.templates}
      saving={state.saving}
      dependenciesReady={dependenciesReady}
      selectReceivers={actions.selectReceivers}
      update={actions.updateDraft}
      close={actions.close}
      submit={() => void actions.submit()}
      recovery={recovery}
      canRetry={state.canRetryOperation}
      retryBusy={state.command !== 'recovering'}
      retry={actions.retry}
    />
  );
}
