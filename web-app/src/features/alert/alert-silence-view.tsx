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

import type { AlertSilenceViewActions, AlertSilenceViewState } from './alert-silence-list-model';
import { AlertManagementNav } from './alert-management-nav';
import { AlertNoiseControlNav } from './alert-noise-control-nav';
import { AlertSilenceEditor } from './alert-silence-editor';
import { AlertSilenceResults } from './alert-silence-results';
import { AlertSilenceToolbar } from './alert-silence-toolbar';
import styles from './alert-policy-page.module.css';

export function AlertSilenceView({ state, actions }: { state: AlertSilenceViewState; actions: AlertSilenceViewActions }) {
  const { t } = useTranslation();
  return <div className={styles.page}>
    <header className={styles.heading}><div>
      <Typography.Title level={2}>{t('alertSilences.title')}</Typography.Title>
      <Typography.Text type="secondary">{t('alertSilences.description')}</Typography.Text>
    </div><Button type="primary" onClick={actions.create}>{t('alertSilences.new')}</Button></header>
    <AlertManagementNav /><AlertNoiseControlNav />
    <AlertSilenceToolbar search={state.search} refreshing={state.refreshing} setSearch={actions.setSearch}
      submit={actions.submitSearch} refresh={actions.refresh} />
    <AlertSilenceResults evidence={state.list} query={state.query} busy={state.busy} actions={actions} />
    {state.draft && <AlertSilenceEditor draft={state.draft} saving={state.busy} update={actions.updateDraft}
      replace={actions.replaceDraft} close={actions.cancel} submit={() => void actions.save()} />}
  </div>;
}
