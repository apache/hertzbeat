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

import { Button, Input, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { AlertManagementNav } from '../components/alert-management-nav';
import { AlertNoiseControlNav } from '../components/alert-noise-control-nav';
import { buildAlertGroupColumns } from '../components/alert-group-columns';
import { AlertGroupEditor } from '../components/alert-group-editor';
import { AlertGroupRecovery } from '../components/alert-group-recovery';
import { AlertGroupDetailFailure, AlertGroupResults } from '../components/alert-group-results';
import { useAlertGroupController } from '../controller/use-alert-group-controller';
import styles from '../shared/alert-policy-page.module.css';

type AlertGroupToolbarProps = {
  refreshing: boolean;
  search: string;
  setSearch: (value: string) => void;
  submitSearch: () => void;
  refresh: () => unknown;
};

function AlertGroupToolbar(props: AlertGroupToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.toolbar}>
      <Input
        allowClear
        value={props.search}
        placeholder={t('alertGroups.search')}
        onChange={event => props.setSearch(event.target.value)}
        onPressEnter={props.submitSearch}
      />
      <Button type="primary" onClick={props.submitSearch}>
        {t('common.query')}
      </Button>
      <Button loading={props.refreshing} onClick={() => void props.refresh()}>
        {t('common.refresh')}
      </Button>
    </div>
  );
}

function AlertGroupPageHeader({ busy, create }: { busy: boolean; create: () => void }) {
  const { t } = useTranslation();
  return (
    <header className={styles.heading}>
      <div>
        <Typography.Title level={2}>{t('alertGroups.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('alertGroups.description')}</Typography.Text>
      </div>
      <Button type="primary" disabled={busy} onClick={create}>
        {t('alertGroups.new')}
      </Button>
    </header>
  );
}

export function AlertGroupPage() {
  const { t } = useTranslation();
  const controller = useAlertGroupController();
  const state = controller.state;
  const busy = state.command !== 'idle';
  const saveRecovery = state.recovery?.kind === 'update' ? state.recovery : undefined;
  const routeRecovery = state.recovery?.kind === 'update' ? undefined : state.recovery;
  const columns = buildAlertGroupColumns(t, {
    busy,
    edit: controller.edit,
    toggle: controller.toggle,
    remove: controller.remove
  });

  return (
    <div className={styles.page}>
      <AlertGroupPageHeader busy={busy} create={controller.create} />
      <AlertManagementNav />
      <AlertNoiseControlNav />
      <AlertGroupToolbar
        refreshing={state.refreshing}
        search={state.search}
        setSearch={controller.setSearch}
        submitSearch={controller.submitSearch}
        refresh={controller.refresh}
      />
      <AlertGroupRecovery recovery={routeRecovery} retrying={state.command !== 'recovering'} retry={controller.retry} />
      <AlertGroupDetailFailure state={state.detail} retry={controller.retryDetail} />
      <AlertGroupResults
        state={state.list}
        columns={columns}
        pageIndex={state.query.pageIndex}
        pageSize={state.query.pageSize}
        changePage={controller.changePage}
        retry={controller.refresh}
      />
      {state.draft && (
        <AlertGroupEditor
          draft={state.draft}
          saving={state.command === 'saving'}
          commandLocked={busy}
          failure={state.editorFailure}
          createAcknowledged={state.createAcknowledged}
          proofFailure={state.createProofFailure}
          recovery={saveRecovery}
          retrying={state.command !== 'recovering'}
          update={controller.updateDraft}
          close={controller.closeDraft}
          submit={controller.submit}
          retry={controller.retry}
        />
      )}
    </div>
  );
}
