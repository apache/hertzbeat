/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useTranslation } from 'react-i18next';

import { AlertManagementNav } from '../components/alert-management-nav';
import { AlertNoiseControlNav } from '../components/alert-noise-control-nav';
import { buildAlertGroupColumns } from '../components/alert-group-columns';
import { AlertGroupEditor } from '../components/alert-group-editor';
import { AlertGroupPageHeader } from '../components/alert-group-page-header';
import { AlertGroupRecovery } from '../components/alert-group-recovery';
import { AlertGroupDetailFailure, AlertGroupResults } from '../components/alert-group-results';
import { AlertGroupToolbar } from '../components/alert-group-toolbar';
import { useAlertGroupController } from '../controller/use-alert-group-controller';
import styles from '../shared/alert-policy-page.module.css';

function useAlertGroupPageColumns(controller: ReturnType<typeof useAlertGroupController>, busy: boolean) {
  const { t } = useTranslation();
  return buildAlertGroupColumns(t, {
    busy,
    canDelete: controller.capabilities.canDelete,
    canWrite: controller.capabilities.canWrite,
    edit: controller.edit,
    toggle: controller.toggle,
    remove: controller.remove
  });
}

export function AlertGroupPage() {
  const controller = useAlertGroupController();
  const state = controller.state;
  const busy = state.command !== 'idle';
  const canRetryRecovery =
    state.recovery?.kind === 'delete' ? controller.capabilities.canDelete : controller.capabilities.canWrite;
  const saveRecovery =
    controller.capabilities.canWrite && state.recovery?.kind === 'update' ? state.recovery : undefined;
  const routeRecovery = saveRecovery ? undefined : state.recovery;
  const removeSelected = () => {
    if (state.selectedIds.length > 0) return controller.removeMany(state.selectedIds);
  };
  const columns = useAlertGroupPageColumns(controller, busy);

  return (
    <div className={styles.page}>
      <AlertGroupPageHeader
        busy={busy}
        canCreate={controller.capabilities.canWrite}
        canDelete={controller.capabilities.canDelete}
        create={controller.create}
        selectedCount={state.selectedIds.length}
        removeSelected={removeSelected}
      />
      <AlertManagementNav />
      <AlertNoiseControlNav />
      <AlertGroupToolbar
        refreshing={state.refreshing}
        search={state.search}
        setSearch={controller.setSearch}
        submitSearch={controller.submitSearch}
        refresh={controller.refresh}
      />
      <AlertGroupRecovery
        canRetry={canRetryRecovery}
        recovery={routeRecovery}
        retrying={state.command !== 'recovering'}
        retry={controller.retry}
      />
      {controller.capabilities.canWrite && (
        <AlertGroupDetailFailure state={state.detail} retry={controller.retryDetail} />
      )}
      <AlertGroupResults
        state={state.list}
        columns={columns}
        pageIndex={state.query.pageIndex}
        pageSize={state.query.pageSize}
        busy={busy}
        canDelete={controller.capabilities.canDelete}
        selectedIds={state.selectedIds}
        selectIds={controller.selectIds}
        changePage={controller.changePage}
        retry={controller.refresh}
      />
      {renderAlertGroupEditor(controller, busy, canRetryRecovery, saveRecovery)}
    </div>
  );
}

function renderAlertGroupEditor(
  controller: ReturnType<typeof useAlertGroupController>,
  busy: boolean,
  canRetry: boolean,
  recovery: ReturnType<typeof useAlertGroupController>['state']['recovery']
) {
  const state = controller.state;
  if (!controller.capabilities.canWrite || !state.draft) return null;
  return (
    <AlertGroupEditor
      draft={state.draft}
      saving={state.command === 'saving'}
      commandLocked={busy}
      canRetry={canRetry}
      failure={state.editorFailure}
      createAcknowledged={state.createAcknowledged}
      proofFailure={state.createProofFailure}
      recovery={recovery}
      retrying={state.command !== 'recovering'}
      labelKeys={state.labelSuggestions.keys}
      update={controller.updateDraft}
      close={controller.closeDraft}
      submit={controller.submit}
      retry={controller.retry}
    />
  );
}
