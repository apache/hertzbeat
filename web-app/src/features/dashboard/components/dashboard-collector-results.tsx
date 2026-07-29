/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Empty, Skeleton, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import type { CollectorListState, CollectorRecord } from '@/features/settings';
import { settingsPaths } from '@/shared/settings/settings-routes';
import styles from './dashboard.module.css';

export function DashboardCollectorResults({ state }: { state: CollectorListState }) {
  const { t } = useTranslation();
  return (
    <section className={styles.section} aria-label={t('collectors.title')}>
      <Typography.Title level={4}>{t('collectors.title')}</Typography.Title>
      <CollectorContent state={state} t={t} />
    </section>
  );
}

function CollectorContent({ state, t }: { state: CollectorListState; t: TFunction }) {
  if (state.kind === 'loading') {
    return <Skeleton active />;
  }
  if (state.kind === 'empty') {
    return <Empty description={t('collectors.empty')} />;
  }
  if (state.kind === 'permission') {
    return <Empty description={t('common.permission.roleRequiredDescription')} />;
  }
  if (state.kind === 'unavailable') {
    return <Empty description={t('collectors.unavailable')} />;
  }
  if (state.kind === 'error') {
    return <Empty description={t('common.routeError.description')} />;
  }
  return (
    <>
      <div>
        <Typography.Text type="secondary">
          {state.records.length} / {state.total}
        </Typography.Text>
        {state.total > state.records.length && (
          <>
            {' · '}
            <Link to={settingsPaths.collectors}>{t('common.view')}</Link>
          </>
        )}
      </div>
      <Table<CollectorRecord>
        rowKey="name"
        pagination={false}
        size="small"
        dataSource={state.records}
        columns={collectorColumns(t)}
      />
    </>
  );
}

function collectorColumns(t: TFunction): ColumnsType<CollectorRecord> {
  return [
    { title: t('collectors.name'), dataIndex: 'name', key: 'name' },
    {
      title: t('collectors.status'),
      key: 'status',
      render: (_, record) => (
        <Tag color={record.online ? 'success' : 'error'}>
          {t(record.online ? 'collectors.online' : 'collectors.offline')}
        </Tag>
      )
    },
    {
      title: t('collectors.tasks'),
      key: 'tasks',
      render: (_, record) => record.pinMonitorNum + record.dispatchMonitorNum
    },
    { title: t('collectors.address'), dataIndex: 'address', key: 'address' },
    {
      title: t('collectors.version'),
      dataIndex: 'version',
      key: 'version',
      render: (value: string | null) => value || '—'
    }
  ];
}
