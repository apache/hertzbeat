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

import { Table, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

import type {
  PublicStatusComponent,
  PublicStatusComponentState,
  PublicStatusHistory
} from '../model/public-status-contract';
import { publicComponentStateKey } from '../model/public-status-model';
import styles from './public-status.module.css';

export function PublicStatusComponents({ components }: { components: PublicStatusComponent[] }) {
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
          scroll={{ x: 720 }}
          expandable={{
            defaultExpandAllRows: true,
            expandedRowRender: component => <History history={component.history} />
          }}
          columns={[
            { title: t('status.component'), dataIndex: 'name' },
            { title: t('status.descriptionLabel'), dataIndex: 'description' },
            {
              title: t('status.state'),
              dataIndex: 'state',
              render: (state: PublicStatusComponentState) => (
                <Tag color={componentStateColor(state)}>{t(publicComponentStateKey(state))}</Tag>
              )
            }
          ]}
        />
      ) : (
        <OperationalStatePanel kind="empty" title={t('status.noComponents')} />
      )}
    </section>
  );
}

function History({ history }: { history: PublicStatusHistory[] | null }) {
  const { t } = useTranslation();
  if (history === null) return <OperationalStatePanel kind="unavailable" title={t('status.historyUnavailable')} />;
  if (!history.length) return <OperationalStatePanel kind="empty" title={t('status.noHistory')} />;
  return (
    <Table<PublicStatusHistory>
      rowKey="timestamp"
      pagination={false}
      size="small"
      dataSource={history}
      scroll={{ x: 880 }}
      columns={[
        {
          title: t('status.historyTime'),
          dataIndex: 'timestamp',
          render: (value: number) => new Date(value).toLocaleString()
        },
        {
          title: t('status.state'),
          dataIndex: 'state',
          render: (state: PublicStatusComponentState) => t(publicComponentStateKey(state))
        },
        {
          title: t('status.uptime'),
          dataIndex: 'uptime',
          render: (value: number | undefined) => (value === undefined ? '—' : `${(value * 100).toFixed(2)}%`)
        },
        { title: t('status.normalSeconds'), dataIndex: 'normal', render: evidence },
        { title: t('status.abnormalSeconds'), dataIndex: 'abnormal', render: evidence },
        { title: t('status.unknownSeconds'), dataIndex: 'unknowing', render: evidence }
      ]}
    />
  );
}

function evidence(value: number | undefined) {
  return value === undefined ? '—' : value;
}

function componentStateColor(state: PublicStatusComponentState) {
  if (state === 'healthy') return 'green';
  if (state === 'incident') return 'red';
  return 'default';
}
