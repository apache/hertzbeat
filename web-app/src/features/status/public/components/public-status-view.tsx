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

import { Alert, Button, Skeleton, Space, Tag, Typography } from 'antd';
import type { CSSProperties } from 'react';

import { defaultStatusAccent } from '@/features/status/shared/status-constants';
import { useTranslation } from 'react-i18next';

import type {
  PublicStatusComponent,
  PublicStatusIncident,
  PublicStatusOrg,
  PublicStatusOrgState,
  PublicStatusState,
  PublicStatusViewModel
} from '../model/public-status-contract';
import type { PublicStatusIncidentRange } from '../model/public-status-incident-range';
import { publicOrgStateKey } from '../model/public-status-model';
import { PublicStatusComponents } from './public-status-components';
import { PublicStatusIncidents } from './public-status-incidents';
import styles from './public-status.module.css';

export function PublicStatusView(props: PublicStatusViewModel) {
  return (
    <main
      className={styles.page}
      style={{ '--status-accent': props.org?.color ?? defaultStatusAccent } as CSSProperties}
    >
      <StatusHeader org={props.org} />
      <StatusBody
        incidentRange={props.incidentRange}
        incidentLoading={props.incidentLoading}
        incidentRefreshing={props.incidentRefreshing}
        loading={props.loading}
        state={props.state}
        components={props.components}
        incidents={props.incidents}
        onIncidentYearChange={props.selectIncidentYear}
        onRefreshIncidents={props.refreshIncidents}
      />
    </main>
  );
}

function StatusHeader({ org }: { org: PublicStatusOrg | undefined }) {
  const { t } = useTranslation();
  return (
    <header className={styles.header}>
      <Space align="start">
        {org && (
          <a href={org.home} target="_blank" rel="noreferrer">
            <img className={styles.logo} src={org.logo} alt={org.name} />
          </a>
        )}
        <div>
          <Typography.Title level={2}>{org?.name ?? t('status.title')}</Typography.Title>
          <Typography.Text type="secondary">{org?.description ?? t('status.description')}</Typography.Text>
        </div>
      </Space>
      <Space>
        {org?.feedback && (
          <Button href={publicStatusFeedbackHref(org.feedback)} target="_blank" rel="noreferrer">
            {t('status.feedback')}
          </Button>
        )}
        {org && <Tag color={orgStateColor(org.state)}>{t(publicOrgStateKey(org.state))}</Tag>}
      </Space>
    </header>
  );
}

function StatusBody({
  loading,
  state,
  components,
  incidents,
  incidentRange,
  incidentLoading,
  incidentRefreshing,
  onIncidentYearChange,
  onRefreshIncidents
}: {
  loading: boolean;
  state: PublicStatusState;
  components: PublicStatusComponent[];
  incidents: PublicStatusIncident[];
  incidentRange: PublicStatusIncidentRange;
  incidentLoading: boolean;
  incidentRefreshing: boolean;
  onIncidentYearChange: (year: number) => void;
  onRefreshIncidents: () => unknown;
}) {
  const { t } = useTranslation();
  if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (state === 'unconfigured') return <Alert type="info" showIcon message={t('status.notConfigured')} />;
  if (state === 'unavailable') return <Alert type="error" showIcon message={t('common.unavailable')} />;
  if (state === 'invalid') return <Alert type="error" showIcon message={t('status.invalid')} />;
  if (state === 'permission') return <Alert type="error" showIcon message={t('status.permission')} />;
  if (state === 'error') return <Alert type="error" showIcon message={t('common.routeError.description')} />;
  return (
    <>
      <PublicStatusComponents components={components} />
      <PublicStatusIncidents
        incidents={incidents}
        loading={incidentLoading}
        range={incidentRange}
        refreshing={incidentRefreshing}
        onYearChange={onIncidentYearChange}
        onRefresh={onRefreshIncidents}
      />
    </>
  );
}

function orgStateColor(state: PublicStatusOrgState) {
  if (state === 'healthy') return 'green';
  if (state === 'degraded') return 'orange';
  if (state === 'incident') return 'red';
  return 'default';
}

function publicStatusFeedbackHref(feedback: string) {
  const normalized = feedback.toLowerCase();
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return feedback;
  return `mailto:${feedback}`;
}
