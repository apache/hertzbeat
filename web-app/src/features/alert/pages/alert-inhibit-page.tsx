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

import { Button, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { AlertManagementNav } from '../components/alert-management-nav';
import { AlertNoiseControlNav } from '../components/alert-noise-control-nav';
import { AlertInhibitEditor } from '../components/alert-inhibit-editor';
import { AlertInhibitRecovery } from '../components/alert-inhibit-recovery';
import { AlertInhibitDetailFailure, AlertInhibitResults } from '../components/alert-inhibit-results';
import { AlertInhibitToolbar } from '../components/alert-inhibit-toolbar';
import { useAlertInhibitController } from '../controller/use-alert-inhibit-controller';
import styles from '../shared/alert-policy-page.module.css';

export function AlertInhibitPage() {
  const { t } = useTranslation();
  const controller = useAlertInhibitController();
  const { command, detail, draft, editorFailure, list, query, recovery, refreshing, search } = controller.state;
  const saveRecovery = recovery?.kind === 'save' ? recovery : undefined;
  const routeRecovery = recovery?.kind === 'save' ? undefined : recovery;
  const busy = command !== 'idle';
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t('alertInhibits.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('alertInhibits.description')}</Typography.Text>
        </div>
        <Button type="primary" disabled={busy} onClick={controller.create}>
          {t('alertInhibits.new')}
        </Button>
      </header>
      <AlertManagementNav />
      <AlertNoiseControlNav />
      <AlertInhibitToolbar
        busy={busy}
        search={search}
        refreshing={refreshing}
        setSearch={controller.setSearch}
        submitSearch={controller.submitSearch}
        refresh={controller.refresh}
      />
      <AlertInhibitRecovery recovery={routeRecovery} retrying={command !== 'recovering'} retry={controller.retry} />
      <AlertInhibitDetailFailure state={detail} busy={busy} retry={controller.retryDetail} />
      <AlertInhibitResults
        state={list}
        busy={busy}
        pageIndex={query.pageIndex}
        pageSize={query.pageSize}
        edit={controller.edit}
        toggle={controller.toggle}
        remove={controller.remove}
        changePage={controller.changePage}
        retry={controller.refresh}
      />
      {draft && (
        <AlertInhibitEditor
          draft={draft}
          busy={busy}
          saving={command === 'saving'}
          failure={editorFailure}
          recovery={saveRecovery}
          retrying={command !== 'recovering'}
          update={controller.updateDraft}
          close={controller.closeDraft}
          submit={controller.submit}
          retry={controller.retry}
        />
      )}
    </div>
  );
}
