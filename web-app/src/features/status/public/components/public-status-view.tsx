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

import { Alert, Empty, Skeleton, Table, Tag, Typography } from 'antd';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  PublicStatusComponent,
  PublicStatusIncident,
  PublicStatusOrg,
  PublicStatusState,
  PublicStatusViewModel
} from '../model/public-status-contract';
import styles from './public-status.module.css';

export function PublicStatusView(props: PublicStatusViewModel) {
  return (
    <main className={styles.page} style={{ '--status-accent': props.org?.color ?? '#5b6fd8' } as CSSProperties}>
      <StatusHeader org={props.org} />
      <StatusBody
        loading={props.loading}
        state={props.state}
        components={props.components}
        incidents={props.incidents}
      />
    </main>
  );
}

function StatusHeader({ org }: { org: PublicStatusOrg | undefined }) {
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

function StatusBody({
  loading,
  state,
  components,
  incidents
}: {
  loading: boolean;
  state: PublicStatusState;
  components: PublicStatusComponent[];
  incidents: PublicStatusIncident[];
}) {
  const { t } = useTranslation();
  if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (state === 'unconfigured') return <Alert type="info" showIcon message={t('status.notConfigured')} />;
  if (state === 'unavailable') return <Alert type="error" showIcon message={t('common.unavailable')} />;
  return <StatusContent components={components} incidents={incidents} />;
}

function StatusContent({
  components,
  incidents
}: {
  components: PublicStatusComponent[];
  incidents: PublicStatusIncident[];
}) {
  return (
    <>
      <StatusComponentsSection components={components} />
      <StatusIncidentsSection incidents={incidents} />
    </>
  );
}

function StatusComponentsSection({ components }: { components: PublicStatusComponent[] }) {
  const { t } = useTranslation();
  return (
    <section className={styles.section}>
      <Typography.Title level={4}>{t('status.components')}</Typography.Title>
      {components.length ? (
        <Table<PublicStatusComponent>
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
      ) : (
        <Empty description={t('status.noComponents')} />
      )}
    </section>
  );
}

function StatusIncidentsSection({ incidents }: { incidents: PublicStatusIncident[] }) {
  const { t } = useTranslation();
  return (
    <section className={styles.section}>
      <Typography.Title level={4}>{t('status.incidents')}</Typography.Title>
      {incidents.length ? (
        <Table<PublicStatusIncident>
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
              render: (value: number | undefined) => (value ? new Date(value).toLocaleString() : '—')
            }
          ]}
        />
      ) : (
        <Empty description={t('status.noIncidents')} />
      )}
    </section>
  );
}
