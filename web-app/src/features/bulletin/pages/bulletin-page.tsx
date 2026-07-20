/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Input, Popconfirm, Space, Table, Tag, Typography, type TableProps } from 'antd';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { BulletinEditor } from '../components/bulletin-editor';
import { BulletinMetricsPanel } from '../components/bulletin-metrics';
import { BulletinPageStatus } from '../components/bulletin-page-status';
import { useBulletinController } from '../controller/bulletin-controller';
import { bulletinPageSizes, formatBulletinTime, type Bulletin } from '../model/bulletin-model';
import styles from '../bulletin-page.module.css';

export function BulletinPage() {
  const { t } = useTranslation();
  const { state, actions } = useBulletinController();
  const busy = state.command !== 'idle' || state.recovery !== null;
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t('bulletin.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('bulletin.description')}</Typography.Text>
        </div>
        <Button type="primary" disabled={busy} onClick={actions.create}>
          {t('bulletin.create')}
        </Button>
      </header>
      <Space.Compact className={styles.toolbar}>
        <Input
          value={state.search}
          placeholder={t('bulletin.search')}
          onChange={event => actions.setSearch(event.target.value)}
          onPressEnter={actions.submitSearch}
        />
        <Button type="primary" onClick={actions.submitSearch}>
          {t('common.query')}
        </Button>
        <Button loading={state.refreshing} onClick={() => void actions.refresh()}>
          {t('common.refresh')}
        </Button>
      </Space.Compact>
      <BulletinPageStatus
        command={state.command}
        list={state.list}
        recovery={state.recovery}
        onRetry={() => void actions.retry()}
      />
      <BulletinTable
        actions={actions}
        busy={busy}
        columns={createBulletinColumns(actions, busy, t)}
        list={state.list}
        query={state.query}
        records={state.list.kind === 'ready' ? state.list.records : []}
        selectedId={state.selectedId}
      />
      <section className={styles.metrics}>
        <Typography.Title level={3}>{t('bulletin.metrics.title')}</Typography.Title>
        <BulletinMetricsPanel state={state.metrics} />
      </section>
      <BulletinEditor
        draft={state.draft}
        dependencies={state.dependencies}
        saving={state.command === 'saving'}
        busy={busy}
        onClose={actions.close}
        onSave={() => void actions.save()}
        onChange={actions.updateDraft}
      />
    </div>
  );
}

type BulletinTableProps = {
  actions: ReturnType<typeof useBulletinController>['actions'];
  busy: boolean;
  columns: NonNullable<TableProps<Bulletin>['columns']>;
  list: ReturnType<typeof useBulletinController>['state']['list'];
  query: ReturnType<typeof useBulletinController>['state']['query'];
  records: Bulletin[];
  selectedId: number | null;
};

function BulletinTable({ actions, busy, columns, list, query, records, selectedId }: BulletinTableProps) {
  if (list.kind !== 'loading' && list.kind !== 'ready') return null;
  return (
    <Table<Bulletin>
      rowKey="id"
      loading={list.kind === 'loading'}
      dataSource={records}
      rowClassName={record => (record.id === selectedId ? (styles.selectedRow ?? '') : '')}
      onRow={record => (busy ? {} : { onClick: () => actions.select(record.id) })}
      pagination={
        list.kind === 'ready'
          ? {
              current: query.pageIndex + 1,
              pageSize: query.pageSize,
              total: list.total,
              showSizeChanger: true,
              pageSizeOptions: [...bulletinPageSizes],
              onChange: actions.changePage
            }
          : false
      }
      columns={columns}
    />
  );
}

function createBulletinColumns(
  actions: ReturnType<typeof useBulletinController>['actions'],
  busy: boolean,
  t: TFunction
): NonNullable<TableProps<Bulletin>['columns']> {
  return [
    { title: t('bulletin.name'), dataIndex: 'name' },
    { title: t('bulletin.application'), dataIndex: 'app', render: value => <Tag>{value}</Tag> },
    { title: t('bulletin.monitors'), dataIndex: 'monitorIds', render: (value: number[]) => value.length },
    { title: t('bulletin.creator'), dataIndex: 'creator' },
    {
      title: t('bulletin.updated'),
      render: (_, record) => formatBulletinTime(record.gmtUpdate ?? record.gmtCreate)
    },
    {
      title: t('common.actions'),
      fixed: 'right',
      render: (_, record) => (
        <Space onClick={event => event.stopPropagation()}>
          <Button type="link" disabled={busy} onClick={() => actions.select(record.id)}>
            {t('bulletin.viewMetrics')}
          </Button>
          <Button type="link" disabled={busy} onClick={() => void actions.edit(record.id)}>
            {t('common.edit')}
          </Button>
          <Popconfirm disabled={busy} title={t('bulletin.deleteConfirm')} onConfirm={() => void actions.remove(record)}>
            <Button type="link" danger disabled={busy}>
              {t('bulletin.delete')}
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];
}
