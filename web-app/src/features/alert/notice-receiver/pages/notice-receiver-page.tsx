/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { OperationalPage, OperationalResultRegion } from '@/shared/operational-page';

import { NoticeReceiverEditor } from '../components/notice-receiver-editor';
import {
  NoticeReceiverHeading,
  NoticeReceiverRecovery,
  NoticeReceiverToolbar
} from '../components/notice-receiver-page-controls';
import { NoticeReceiverResults } from '../components/notice-receiver-results';
import { useNoticeReceiverController } from '../controller/notice-receiver-controller';
import { canSubmitNoticeReceiver } from '../controller/notice-receiver-action-admission';

export function NoticeReceiverPage() {
  const { state, actions } = useNoticeReceiverController();
  const recovering = state.command === 'recovering';
  const interactionBusy = state.busy || state.refreshing;
  return (
    <OperationalPage>
      <NoticeReceiverHeading busy={interactionBusy} canCreate={state.capabilities.canCreate} create={actions.create} />
      <NoticeReceiverToolbar
        name={state.name}
        refreshing={state.refreshing}
        busy={state.busy}
        recovering={recovering}
        recoveryRetryable={(state.recovery?.retryable ?? false) && state.canRetryOperation}
        setName={actions.setName}
        search={actions.search}
        refresh={actions.refresh}
      />
      <OperationalResultRegion>
        <NoticeReceiverRecovery
          canRetry={state.canRetryOperation}
          recovery={state.recovery}
          busy={!recovering}
          retry={actions.retry}
        />
        <NoticeReceiverResults
          actionPolicy={state.capabilities}
          state={state.list}
          busy={interactionBusy}
          pageIndex={state.query.pageIndex}
          pageSize={state.query.pageSize}
          edit={id => void actions.edit(id)}
          remove={record => void actions.remove(record)}
          retry={() => void actions.refresh()}
          onPageChange={actions.changePage}
        />
      </OperationalResultRegion>
      {state.draft && canSubmitNoticeReceiver(state.capabilities, state.draft) ? (
        <NoticeReceiverEditor
          draft={state.draft}
          saving={state.saving}
          testing={state.testing}
          busy={state.busy}
          canTest={state.capabilities.canTest}
          update={actions.updateDraft}
          selectType={actions.selectType}
          setSecretCleared={actions.setSecretCleared}
          close={actions.close}
          submit={() => void actions.submit()}
          {...(state.testRecovery
            ? {
                testRecovery: state.testRecovery,
                retryTest: () => void actions.retryTest(),
                dismissTestRecovery: () => void actions.dismissTestRecovery()
              }
            : { test: () => void actions.sendTest() })}
        />
      ) : null}
    </OperationalPage>
  );
}
