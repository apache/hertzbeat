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

import { Button, Popconfirm, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

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
import styles from '../shared/alert-policy-page.module.css';

export function AlertSilenceView({
  state,
  actions
}: {
  state: AlertSilenceViewState;
  actions: AlertSilenceViewActions;
}) {
  const draft = alertSilenceDetailDraft(state.detail);
  const editorRecovery = draft && isSaveRecovery(state.recovery) ? state.recovery : null;
  const pageRecovery = editorRecovery ? null : state.recovery;
  return (
    <div className={styles.page}>
      <AlertSilenceHeader state={state} actions={actions} />
      <AlertManagementNav />
      <AlertNoiseControlNav />
      <AlertSilenceManagement state={state} actions={actions} />
      <AlertSilenceToolbar
        search={state.search}
        refreshing={state.refreshing}
        setSearch={actions.setSearch}
        submit={actions.submitSearch}
        refresh={actions.refresh}
      />
      <AlertSilenceRecovery busy={state.busy} recovery={pageRecovery} retry={actions.refresh} />
      <AlertSilenceResults
        evidence={state.list}
        query={state.query}
        writeLocked={state.writeLocked}
        selectedIds={state.selectedIds}
        selectIds={actions.selectIds}
        actions={actions}
      />
      {draft && (
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
    </div>
  );
}

function AlertSilenceHeader({ state, actions }: { state: AlertSilenceViewState; actions: AlertSilenceViewActions }) {
  const { t } = useTranslation();
  return (
    <header className={styles.heading}>
      <div>
        <Typography.Title level={2}>{t('alertSilences.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('alertSilences.description')}</Typography.Text>
      </div>
      <Space>
        {state.selectedIds.length > 0 && (
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
        <Button type="primary" disabled={state.writeLocked} onClick={actions.create}>
          {t('alertSilences.new')}
        </Button>
      </Space>
    </header>
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
