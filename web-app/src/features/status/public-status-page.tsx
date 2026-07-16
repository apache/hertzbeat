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

import { useQuery } from '@tanstack/react-query';
import { Alert, Empty, Skeleton, Table, Tag, Typography } from 'antd';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { apiMessageGet, type PageResult } from '@/core/http/api-message';

import styles from './public-status-page.module.css';
import { publicStatusState, type PublicStatusState } from './status-model';

type StatusOrg = { name: string; description: string; home?: string; state: number; color?: string };
type StatusComponent = { id: number; name: string; description?: string; state: number; latestTime?: number };
type StatusIncident = { id: number; name: string; state: number; startTime?: number; endTime?: number };

function StatusHeader({ org }: { org: StatusOrg | undefined }) {
  const { t } = useTranslation();
  return (
    <header className={styles.header}>
      <div>
        <Typography.Title level={2}>{org?.name ?? t('status.title')}</Typography.Title>
        <Typography.Text type="secondary">{org?.description ?? t('status.description')}</Typography.Text>
      </div>
      {org && (
        <Tag color={org.state === 0 ? 'green' : 'red'}>
          {org.state === 0 ? t('status.operational') : t('status.degraded')}
        </Tag>
      )}
    </header>
  );
}

function StatusContent({ components, incidents }: {
  components: StatusComponent[];
  incidents: StatusIncident[];
}) {
  const { t } = useTranslation();
  return (
    <>
      <section className={styles.section}>
        <Typography.Title level={4}>{t('status.components')}</Typography.Title>
        {components.length ? (
          <Table<StatusComponent>
            rowKey="id"
            pagination={false}
            size="small"
            dataSource={components}
            columns={[
              { title: t('status.component'), dataIndex: 'name' },
              { title: t('status.descriptionLabel'), dataIndex: 'description' },
              {
                title: t('status.state'),
                dataIndex: 'state',
                render: (state: number) => (
                  <Tag color={state === 0 ? 'green' : 'red'}>
                    {state === 0 ? t('status.normal') : t('status.abnormal')}
                  </Tag>
                )
              }
            ]}
          />
        ) : <Empty description={t('status.noComponents')} />}
      </section>
      <section className={styles.section}>
        <Typography.Title level={4}>{t('status.incidents')}</Typography.Title>
        {incidents.length ? (
          <Table<StatusIncident>
            rowKey="id"
            pagination={false}
            size="small"
            dataSource={incidents}
            columns={[
              { title: t('status.incident'), dataIndex: 'name' },
              { title: t('status.state'), dataIndex: 'state' },
              {
                title: t('status.started'),
                dataIndex: 'startTime',
                render: (value: number | undefined) => value ? new Date(value).toLocaleString() : '—'
              }
            ]}
          />
        ) : <Empty description={t('status.noIncidents')} />}
      </section>
    </>
  );
}

function StatusBody({ loading, state, components, incidents }: {
  loading: boolean;
  state: PublicStatusState;
  components: StatusComponent[];
  incidents: StatusIncident[];
}) {
  const { t } = useTranslation();
  if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (state === 'unconfigured') return <Alert type="info" showIcon message={t('status.notConfigured')} />;
  if (state === 'unavailable') return <Alert type="error" showIcon message={t('common.unavailable')} />;
  return <StatusContent components={components} incidents={incidents} />;
}

export function PublicStatusPage() {
  const org = useQuery({ queryKey: ['public-status-org'], queryFn: () => apiMessageGet<StatusOrg>('/api/status/page/public/org') });
  const components = useQuery({ queryKey: ['public-status-components'], queryFn: () => apiMessageGet<StatusComponent[]>('/api/status/page/public/component') });
  const incidents = useQuery({ queryKey: ['public-status-incidents'], queryFn: () => apiMessageGet<PageResult<StatusIncident>>('/api/status/page/public/incident?pageIndex=0&pageSize=20') });
  const queries = [org, components, incidents];
  const state = publicStatusState(org.isError, components.isError, incidents.isError);

  return (
    <main className={styles.page} style={{ '--status-accent': org.data?.color ?? '#5b6fd8' } as CSSProperties}>
      <StatusHeader org={org.data} />
      <StatusBody
        loading={queries.some(query => query.isPending)}
        state={state}
        components={components.data ?? []}
        incidents={incidents.data?.content ?? []}
      />
    </main>
  );
}
