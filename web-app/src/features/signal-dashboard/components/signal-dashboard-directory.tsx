/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useState } from 'react';
import { Button, Input, Table, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { SignalDashboardRecord } from '../model/signal-dashboard-record';
import type { DashboardViewProps } from '../model/signal-dashboard-view-model';
import { signalDashboardDirectoryColumns } from './signal-dashboard-directory-columns';
import styles from './signal-dashboard.module.css';

export function SignalDashboardDirectory({ state, actions }: DashboardViewProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase();
  const records = state.records.filter(record => record.title.toLocaleLowerCase().includes(query));
  if (state.listState !== 'ready')
    return (
      <Typography.Paragraph role={state.listState === 'error' ? 'alert' : 'status'}>
        {t(`signalDashboard.${state.listState}`)}
      </Typography.Paragraph>
    );
  return (
    <>
      <div className={styles.directorySearch}>
        <Input
          aria-label={t('signalDashboard.search')}
          placeholder={t('signalDashboard.search')}
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
        <Button disabled={!search} onClick={() => setSearch('')}>
          {t('signalDashboard.clearSearch')}
        </Button>
        <Typography.Text role="status" aria-live="polite">
          {t('signalDashboard.searchCount', { count: records.length, total: state.records.length })}
        </Typography.Text>
      </div>
      <Table<SignalDashboardRecord>
        size="small"
        rowKey="dashboardKey"
        dataSource={records}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        locale={{
          emptyText: (
            <Typography.Text style={{ color: 'var(--hb-text-secondary)' }}>
              {t(query ? 'signalDashboard.noMatches' : 'signalDashboard.empty')}
            </Typography.Text>
          )
        }}
        scroll={{ x: 620 }}
        columns={signalDashboardDirectoryColumns({ state, actions }, t)}
      />
    </>
  );
}
