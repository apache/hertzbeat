/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { OperationalPage } from '@/shared/operational-page';

import { NoticeReceiverEditor } from '../components/notice-receiver-editor';
import {
  NoticeReceiverHeading,
  NoticeReceiverRecovery,
  NoticeReceiverToolbar
} from '../components/notice-receiver-page-controls';
import { NoticeReceiverResults } from '../components/notice-receiver-results';
import { useNoticeReceiverController } from '../controller/notice-receiver-controller';

export function NoticeReceiverPage() {
  const { state, actions } = useNoticeReceiverController();
  const recovering = state.command === 'recovering';
  return (
    <OperationalPage>
      <NoticeReceiverHeading busy={state.busy} create={actions.create} />
      <NoticeReceiverToolbar
        name={state.name}
        refreshing={state.refreshing}
        busy={state.busy}
        recovering={recovering}
        recoveryRetryable={state.recovery?.retryable ?? false}
        setName={actions.setName}
        search={actions.search}
        refresh={actions.refresh}
      />
      <NoticeReceiverRecovery recovery={state.recovery} busy={!recovering} retry={actions.retry} />
      <NoticeReceiverResults
        state={state.list}
        busy={state.busy}
        pageIndex={state.query.pageIndex}
        pageSize={state.query.pageSize}
        edit={id => void actions.edit(id)}
        remove={record => void actions.remove(record)}
        onPageChange={actions.changePage}
      />
      {state.draft ? (
        <NoticeReceiverEditor
          draft={state.draft}
          saving={state.saving}
          testing={state.testing}
          busy={state.busy}
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
