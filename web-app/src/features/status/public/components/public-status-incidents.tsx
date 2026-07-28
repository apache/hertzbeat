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

import { Alert, Button, Empty, InputNumber, Skeleton, Space, Table, Tag, Timeline, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { PublicStatusIncident, PublicStatusIncidentState } from '../model/public-status-contract';
import {
  earliestPublicStatusIncidentYear,
  type PublicStatusIncidentRange
} from '../model/public-status-incident-range';
import { publicIncidentStateKey } from '../model/public-status-model';
import styles from './public-status.module.css';

type IncidentProps = {
  incidents: PublicStatusIncident[];
  loading: boolean;
  range: PublicStatusIncidentRange;
  refreshing: boolean;
  onYearChange: (year: number) => void;
  onRefresh: () => unknown;
};

export function PublicStatusIncidents({
  incidents,
  loading,
  range,
  refreshing,
  onYearChange,
  onRefresh
}: IncidentProps) {
  const { t } = useTranslation();
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <Typography.Title level={4}>{t('status.incidents')}</Typography.Title>
        <Space>
          <Typography.Text>{t('status.incidentYear')}</Typography.Text>
          <InputNumber
            aria-label={t('status.incidentYear')}
            precision={0}
            min={earliestPublicStatusIncidentYear}
            max={new Date().getFullYear()}
            value={range.year}
            onChange={value => {
              if (typeof value === 'number') onYearChange(value);
            }}
          />
          <Button loading={refreshing} onClick={() => void onRefresh()}>
            {t('common.refresh')}
          </Button>
        </Space>
      </div>
      {loading ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : incidents.length ? (
        <Table<PublicStatusIncident>
          rowKey="id"
          pagination={false}
          size="small"
          dataSource={incidents}
          expandable={{
            defaultExpandAllRows: true,
            expandedRowRender: incident => <IncidentEvidence incident={incident} />
          }}
          columns={[
            { title: t('status.incident'), dataIndex: 'name' },
            {
              title: t('status.state'),
              dataIndex: 'state',
              render: (state: PublicStatusIncidentState) => <Tag>{t(publicIncidentStateKey(state))}</Tag>
            },
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

function IncidentEvidence({ incident }: { incident: PublicStatusIncident }) {
  const { t } = useTranslation();
  if (incident.components === null || incident.contents === null) {
    return <Alert type="warning" showIcon message={t('status.incidentDetailsUnavailable')} />;
  }
  return (
    <Space direction="vertical" className={styles.incidentEvidence ?? ''}>
      <div>
        <Typography.Text strong>{t('status.affectedComponents')}</Typography.Text>{' '}
        {incident.components.length
          ? incident.components.map(component => <Tag key={component.id}>{component.name}</Tag>)
          : t('status.noAffectedComponents')}
      </div>
      {incident.contents.length ? (
        <Timeline
          items={incident.contents.map(content => ({
            key: content.id,
            children: (
              <>
                <Space>
                  <Typography.Text>{new Date(content.timestamp).toLocaleString()}</Typography.Text>
                  <Tag>{t(publicIncidentStateKey(content.state))}</Tag>
                </Space>
                <div>{content.message}</div>
              </>
            )
          }))}
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('status.noIncidentUpdates')} />
      )}
    </Space>
  );
}
