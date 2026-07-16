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
import { Empty, Statistic, Table, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { monitorTotals, type AppCount, type DashboardData } from '../model/dashboard-model';
import styles from './dashboard.module.css';

export function DashboardResults({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  const totals = monitorTotals(data.apps);
  return <>
    <section className={styles.metrics} aria-label={t('dashboard.monitorSummary')}>
      <Statistic title={t('dashboard.total')} value={totals.total} />
      <Statistic title={t('dashboard.available')} value={totals.available} />
      <Statistic title={t('dashboard.unavailable')} value={totals.unavailable} />
      <Statistic title={t('dashboard.alerts')} value={data.alert.total} />
    </section>
    <section className={styles.section}>
      <Typography.Title level={4}>{t('dashboard.distribution')}</Typography.Title>
      {data.apps.length === 0 ? <Empty description={t('dashboard.empty')} /> : <Table<AppCount>
        rowKey={row => `${row.category}-${row.app}`} pagination={false} size="small" dataSource={data.apps}
        columns={[{ title: t('dashboard.application'), dataIndex: 'app' },
          { title: t('dashboard.category'), dataIndex: 'category' }, { title: t('dashboard.total'), dataIndex: 'size' },
          { title: t('dashboard.available'), dataIndex: 'availableSize', render: (value: number) => <Tag color="green">{value}</Tag> },
          { title: t('dashboard.unavailable'), dataIndex: 'unAvailableSize',
            render: (value: number) => <Tag color={value > 0 ? 'red' : 'default'}>{value}</Tag> }]} />}
    </section>
  </>;
}
