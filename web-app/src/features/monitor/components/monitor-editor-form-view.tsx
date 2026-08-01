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

import { Button, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalFormActions, OperationalSection, OperationalStatePanel } from '@/shared/operational-page';

import { monitorAppOptions } from '../model/monitor-model';
import type { MonitorEditorFormController } from './monitor-editor-form-model';
import { ReadyMonitorEditorForm } from './monitor-editor-ready-form';
import styles from './monitor-editor-form-view.module.css';

export function MonitorEditorFormView({
  mode,
  controller
}: {
  mode: 'new' | 'edit';
  controller: MonitorEditorFormController;
}) {
  const { t } = useTranslation();
  const { evidence, draft, apps } = controller.state;
  if (evidence.kind === 'loading') return <OperationalStatePanel kind="loading" title={t('monitor.loading')} />;
  if (evidence.kind !== 'ready') {
    const kind = evidence.kind === 'missing' || evidence.kind === 'invalid' ? 'empty' : evidence.kind;
    return (
      <OperationalStatePanel
        kind={kind}
        title={t(evidenceMessageKey(evidence.kind))}
        action={
          evidence.kind === 'missing' || evidence.kind === 'invalid' ? (
            <Button onClick={controller.actions.cancel}>{t('common.back')}</Button>
          ) : (
            <Button onClick={() => void controller.actions.retry()}>{t('common.retry')}</Button>
          )
        }
      />
    );
  }
  if (!draft) {
    if (apps.length === 0)
      return (
        <OperationalStatePanel
          kind="empty"
          title={t('monitor.editor.appEmpty')}
          action={<Button onClick={controller.actions.cancel}>{t('common.cancel')}</Button>}
        />
      );
    return (
      <OperationalSection title={t('monitor.application')}>
        <div className={styles.form}>
          <label>
            {t('monitor.application')}
            <Select<string>
              showSearch
              options={monitorAppOptions(apps)}
              onChange={app => controller.actions.changeSource({ app, scrape: 'static' })}
            />
          </label>
        </div>
        <OperationalFormActions>
          <Button onClick={controller.actions.cancel}>{t('common.cancel')}</Button>
        </OperationalFormActions>
      </OperationalSection>
    );
  }
  // Structured fields retain invalid rows locally, so a new canonical source
  // must remount the form instead of leaking rows from the previous monitor.
  return <ReadyMonitorEditorForm key={controller.state.sourceKey} mode={mode} controller={controller} draft={draft} />;
}

function evidenceMessageKey(kind: 'missing' | 'invalid' | 'unavailable' | 'error') {
  if (kind === 'missing') return 'common.notFound.description';
  if (kind === 'unavailable') return 'common.unavailable';
  return 'common.routeError.description';
}
