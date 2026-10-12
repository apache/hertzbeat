/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { OperationalPage, OperationalResultRegion } from '@/shared/operational-page';
import { NotificationWorkspaceNavigation, notificationListStatus } from '@/shared/notification-workspace';
import { useNoticeReceiverUnsavedHistory } from '../controller/use-notice-receiver-unsaved-history';

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
  const controller = useNoticeReceiverController();
  const { state, actions } = controller;
  // Only POP history is guarded; explicit modal close keeps its existing discard action.
  useNoticeReceiverUnsavedHistory(state.dirty);
  const recovering = state.command === 'recovering';
  const interactionBusy = state.busy || state.refreshing;
  return (
    <OperationalPage>
      <NoticeReceiverHeading busy={interactionBusy} canCreate={state.capabilities.canCreate} create={actions.create} />
      <NotificationWorkspaceNavigation activeStep="receivers" status={notificationListStatus(state.list)} />
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
      <NoticeReceiverEditorBoundary controller={controller} />
    </OperationalPage>
  );
}

function NoticeReceiverEditorBoundary({ controller }: { controller: ReturnType<typeof useNoticeReceiverController> }) {
  const { state, actions } = controller;
  if (!state.draft || !canSubmitNoticeReceiver(state.capabilities, state.draft)) return null;
  const testAction = state.testRecovery
    ? {
        testRecovery: state.testRecovery,
        retryTest: () => void actions.retryTest(),
        dismissTestRecovery: () => void actions.dismissTestRecovery()
      }
    : { test: () => void actions.sendTest() };
  return (
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
      {...testAction}
    />
  );
}
