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
import { useState } from 'react';
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
import { MonitorDetailConfigurationDrawer, MonitorDetailSummary } from './monitor-detail-metadata';
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
  if (state.detail.kind !== 'ready') {
    return <MonitorDetailState evidence={state.detail} onBack={actions.back} onRetry={actions.refresh} />;
  }
  return (
    <MonitorReadyDetailView
      key={state.detail.detail.monitor.id}
      detail={state.detail.detail}
      state={state}
      actions={actions}
      metricWorkbench={metricWorkbench}
    />
  );
}

function MonitorReadyDetailView({
  detail,
  state,
  actions,
  metricWorkbench
}: {
  detail: Extract<MonitorDetailEvidence, { kind: 'ready' }>['detail'];
  state: MonitorDetailViewState;
  actions: MonitorDetailViewActions;
  metricWorkbench?: ReactNode;
}) {
  const { t } = useTranslation();
  const [configurationOpen, setConfigurationOpen] = useState(false);
  const { monitor } = detail;
  return (
    <OperationalPage mode="workspace">
      <OperationalPageHeader
        title={monitor.name}
        description={
          <span className={styles.identityContext}>
            <span>{monitor.app}</span>
            <span aria-hidden="true">·</span>
            <span>{monitor.instance}</span>
          </span>
        }
        actions={
          <>
            <MonitorHelpLink />
            <Button onClick={actions.back}>{t('common.back')}</Button>
            <Button onClick={() => setConfigurationOpen(true)}>{t('monitor.metadata.viewConfiguration')}</Button>
            {state.canEdit ? (
              <Button type="primary" onClick={actions.edit}>
                {t('common.edit')}
              </Button>
            ) : null}
          </>
        }
      />
      <MonitorDetailSummary monitor={monitor} collector={detail.collector} />
      {metricWorkbench}
      <MonitorDetailConfigurationDrawer
        open={configurationOpen}
        onClose={() => setConfigurationOpen(false)}
        monitor={monitor}
        collector={detail.collector}
        params={detail.params}
      />
      <MonitorGrafanaDashboard
        dashboard={detail.grafanaDashboard}
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
  onBack,
  onRetry
}: {
  evidence: Exclude<MonitorDetailEvidence, { kind: 'ready' }>;
  onBack: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  // Loading and missing are conclusive presentation states. Only transport or
  // server failures need an operator-controlled recovery action.
  const retryable = evidence.kind === 'unavailable' || evidence.kind === 'error';
  return (
    <OperationalPage mode="workspace">
      <OperationalPageHeader
        title={t('monitor.detail')}
        actions={<Button onClick={onBack}>{t('common.back')}</Button>}
      />
      <OperationalStatePanel
        kind={evidence.kind === 'missing' ? 'empty' : evidence.kind}
        title={t(monitorDetailStateMessage(evidence.kind))}
        action={retryable ? <Button onClick={onRetry}>{t('common.retry')}</Button> : undefined}
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
