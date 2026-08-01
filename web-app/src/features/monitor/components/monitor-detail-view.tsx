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

import { Alert, Button, Popconfirm } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
  OperationalPage,
  OperationalPageHeader,
  OperationalSection,
  OperationalStatePanel
} from '@/shared/operational-page';

import type {
  MonitorDetailEvidence,
  MonitorDetailViewActions,
  MonitorDetailViewState
} from '../model/monitor-detail-model';
import { safeMonitorGrafanaUrl } from '../model/monitor-detail-model';
import { MonitorDetailMetadata } from './monitor-detail-metadata';
import { MonitorHelpLink } from './monitor-help-link';
import styles from './monitor-detail-view.module.css';

export function MonitorDetailView({
  state,
  actions,
  metricWorkbench
}: {
  state: MonitorDetailViewState;
  actions: MonitorDetailViewActions;
  metricWorkbench?: ReactNode;
}) {
  const { t } = useTranslation();
  if (state.detail.kind !== 'ready') return <MonitorDetailState evidence={state.detail} onBack={actions.back} />;
  const { monitor } = state.detail.detail;
  return (
    <OperationalPage mode="workspace">
      <OperationalPageHeader
        title={monitor.name}
        description={monitor.instance}
        actions={
          <>
            <MonitorHelpLink />
            <Button onClick={actions.back}>{t('common.back')}</Button>
            {state.canEdit ? (
              <Button type="primary" onClick={actions.edit}>
                {t('common.edit')}
              </Button>
            ) : null}
          </>
        }
      />
      <OperationalSection title={t('monitor.detail')}>
        <MonitorDetailMetadata
          monitor={monitor}
          collector={state.detail.detail.collector}
          params={state.detail.detail.params}
        />
      </OperationalSection>
      {metricWorkbench}
      <MonitorGrafanaDashboard
        dashboard={state.detail.detail.grafanaDashboard}
        deleting={state.grafanaDeleting}
        deleteError={state.grafanaDeleteError}
        canDelete={state.canDeleteGrafanaDashboard}
        onDelete={actions.deleteGrafanaDashboard}
      />
    </OperationalPage>
  );
}

function MonitorDetailState({
  evidence,
  onBack
}: {
  evidence: Exclude<MonitorDetailEvidence, { kind: 'ready' }>;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  return (
    <OperationalPage mode="workspace">
      <OperationalPageHeader
        title={t('monitor.detail')}
        actions={<Button onClick={onBack}>{t('common.back')}</Button>}
      />
      <OperationalStatePanel
        kind={evidence.kind === 'missing' ? 'empty' : evidence.kind}
        title={t(monitorDetailStateMessage(evidence.kind))}
      />
    </OperationalPage>
  );
}

function monitorDetailStateMessage(kind: Exclude<MonitorDetailEvidence, { kind: 'ready' }>['kind']) {
  switch (kind) {
    case 'loading':
      return 'monitor.loading';
    case 'missing':
      return 'common.notFound.description';
    case 'unavailable':
      return 'common.unavailable';
    case 'error':
      return 'common.routeError.description';
  }
}

function MonitorGrafanaDashboard({
  dashboard,
  deleting,
  deleteError,
  canDelete,
  onDelete
}: {
  dashboard: Extract<MonitorDetailEvidence, { kind: 'ready' }>['detail']['grafanaDashboard'];
  deleting: boolean;
  deleteError: boolean;
  canDelete: boolean;
  onDelete: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const url = safeMonitorGrafanaUrl(dashboard);
  if (!url) return null;
  return (
    <OperationalSection
      title={t('monitor.grafana.title')}
      actions={
        canDelete ? (
          <Popconfirm
            title={t('monitor.grafana.deleteConfirm')}
            okText={t('common.delete')}
            cancelText={t('common.cancel')}
            okButtonProps={{ danger: true }}
            onConfirm={() => void onDelete()}
          >
            <Button danger loading={deleting}>
              {t('monitor.grafana.delete')}
            </Button>
          </Popconfirm>
        ) : null
      }
    >
      <div className={styles.dashboard}>
        {deleteError ? <Alert type="error" showIcon message={t('monitor.grafana.deleteFailure')} /> : null}
        <iframe
          className={styles.dashboardFrame}
          src={url}
          title={t('monitor.grafana.title')}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    </OperationalSection>
  );
}
