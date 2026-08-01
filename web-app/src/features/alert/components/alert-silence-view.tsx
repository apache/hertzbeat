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

import { Button, Popconfirm, Space } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  OperationalCommandBar,
  OperationalPage,
  OperationalPageHeader,
  OperationalResultRegion
} from '@/shared/operational-page/operational-page';

import {
  alertSilenceDetailDraft,
  type AlertSilenceViewActions,
  type AlertSilenceViewState
} from '../model/alert-silence-page-model';
import { AlertManagementNav } from './alert-management-nav';
import { AlertNoiseControlManagementContextBar } from './alert-noise-control-management-context';
import { AlertNoiseControlNav } from './alert-noise-control-nav';
import { AlertSilenceEditor } from './alert-silence-editor';
import { AlertSilenceResults } from './alert-silence-results';
import { AlertSilenceToolbar } from './alert-silence-toolbar';
import { AlertSilenceRecovery } from './alert-silence-recovery';

export function AlertSilenceView({
  state,
  actions
}: {
  state: AlertSilenceViewState;
  actions: AlertSilenceViewActions;
}) {
  const { t } = useTranslation();
  const draft = alertSilenceDetailDraft(state.detail);
  const editorRecovery = draft && isSaveRecovery(state.recovery) ? state.recovery : null;
  const pageRecovery = editorRecovery ? null : state.recovery;
  return (
    <OperationalPage mode="data">
      <AlertSilenceHeader state={state} actions={actions} />
      <AlertManagementNav />
      <AlertNoiseControlNav />
      <AlertSilenceManagement state={state} actions={actions} />
      <OperationalCommandBar
        role="search"
        ariaLabel={t('alertSilences.search')}
        primary={
          <AlertSilenceToolbar
            search={state.search}
            refreshing={state.refreshing}
            setSearch={actions.setSearch}
            submit={actions.submitSearch}
            refresh={actions.refresh}
          />
        }
      />
      <OperationalResultRegion>
        <AlertSilenceRecovery
          busy={state.busy}
          canRetry={state.canRetryRecovery}
          recovery={pageRecovery}
          retry={actions.refresh}
        />
        <AlertSilenceResults
          capabilities={state.capabilities}
          evidence={state.list}
          query={state.query}
          writeLocked={state.writeLocked}
          selectedIds={state.selectedIds}
          selectIds={actions.selectIds}
          actions={actions}
        />
      </OperationalResultRegion>
      {state.capabilities.canWrite && draft && (
        <AlertSilenceEditor
          draft={draft}
          recovery={editorRecovery}
          saving={state.busy}
          writeLocked={state.writeLocked}
          update={actions.updateDraft}
          replace={actions.replaceDraft}
          close={actions.cancel}
          retry={actions.refresh}
          submit={() => void actions.save()}
        />
      )}
    </OperationalPage>
  );
}

function AlertSilenceHeader({ state, actions }: { state: AlertSilenceViewState; actions: AlertSilenceViewActions }) {
  const { t } = useTranslation();
  return (
    <OperationalPageHeader
      title={t('alertSilences.title')}
      description={t('alertSilences.description')}
      actions={
        <Space>
          {state.capabilities.canDelete && state.selectedIds.length > 0 && (
            <Popconfirm
              title={t('alertSilences.deleteSelectedConfirm', { count: state.selectedIds.length })}
              disabled={state.writeLocked}
              okText={t('common.delete')}
              onConfirm={() => void actions.removeMany(state.selectedIds)}
            >
              <Button danger disabled={state.writeLocked}>
                {t('alertSilences.deleteSelected')}
              </Button>
            </Popconfirm>
          )}
          {state.capabilities.canWrite && (
            <Button type="primary" disabled={state.writeLocked} onClick={actions.create}>
              {t('alertSilences.new')}
            </Button>
          )}
        </Space>
      }
    />
  );
}

function AlertSilenceManagement({
  state,
  actions
}: {
  state: AlertSilenceViewState;
  actions: AlertSilenceViewActions;
}) {
  return (
    <AlertNoiseControlManagementContextBar
      context={state.management.context}
      missingCount={state.management.missingCount}
      busy={state.busy}
      translationRoot="alertSilences"
      viewAll={actions.viewAllRules}
      viewMatched={actions.viewMatchedRules}
      returnToEntity={actions.returnToEntity}
    />
  );
}

function isSaveRecovery(recovery: AlertSilenceViewState['recovery']) {
  return recovery?.kind === 'create' || recovery?.kind === 'update';
}
