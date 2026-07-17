/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Empty, Input, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { BulletinEditor } from '../components/bulletin-editor';
import { BulletinMetricsPanel } from '../components/bulletin-metrics';
import { useBulletinController } from '../controller/bulletin-controller';
import { formatBulletinTime, type Bulletin } from '../model/bulletin-model';
import styles from '../bulletin-page.module.css';

export function BulletinPage() {
  const { t } = useTranslation();
  const { state, actions } = useBulletinController();
  const records = state.list.kind === 'ready' ? state.list.records : [];
  return <div className={styles.page}>
    <header className={styles.heading}>
      <div><Typography.Title level={2}>{t('bulletin.title')}</Typography.Title><Typography.Text type="secondary">{t('bulletin.description')}</Typography.Text></div>
      <Button type="primary" onClick={actions.create}>{t('bulletin.create')}</Button>
    </header>
    <Space.Compact className={styles.toolbar}>
      <Input value={state.search} placeholder={t('bulletin.search')} onChange={event => actions.setSearch(event.target.value)} onPressEnter={actions.submitSearch} />
      <Button type="primary" onClick={actions.submitSearch}>{t('common.query')}</Button>
      <Button loading={state.refreshing} onClick={actions.refresh}>{t('common.refresh')}</Button>
    </Space.Compact>
    {['invalid', 'unavailable', 'error'].includes(state.list.kind) && <Alert type="error" showIcon message={t(`bulletin.list.${state.list.kind}`)} />}
    {state.list.kind === 'empty' && <Empty description={t('bulletin.empty')} />}
    {(state.list.kind === 'loading' || state.list.kind === 'ready') && <Table<Bulletin>
      rowKey="id" loading={state.list.kind === 'loading'} dataSource={records}
      rowClassName={record => record.id === state.selectedId ? (styles.selectedRow ?? '') : ''}
      onRow={record => ({ onClick: () => actions.select(record.id) })}
      pagination={state.list.kind === 'ready' ? {
        current: state.query.pageIndex + 1, pageSize: state.query.pageSize, total: state.list.total,
        showSizeChanger: true, pageSizeOptions: [8, 15, 25], onChange: actions.changePage
      } : false}
      columns={[
        { title: t('bulletin.name'), dataIndex: 'name' },
        { title: t('bulletin.application'), dataIndex: 'app', render: value => <Tag>{value}</Tag> },
        { title: t('bulletin.monitors'), dataIndex: 'monitorIds', render: (value: number[]) => value.length },
        { title: t('bulletin.creator'), dataIndex: 'creator' },
        { title: t('bulletin.updated'), render: (_, record) => formatBulletinTime(record.gmtUpdate ?? record.gmtCreate) },
        { title: t('common.actions'), fixed: 'right', render: (_, record) => <Space onClick={event => event.stopPropagation()}>
          <Button type="link" onClick={() => actions.select(record.id)}>{t('bulletin.viewMetrics')}</Button>
          <Button type="link" onClick={() => void actions.edit(record.id)}>{t('common.edit')}</Button>
          <Popconfirm title={t('bulletin.deleteConfirm')} onConfirm={() => void actions.remove(record)}>
            <Button type="link" danger>{t('bulletin.delete')}</Button>
          </Popconfirm>
        </Space> }
      ]}
    />}
    <section className={styles.metrics}><Typography.Title level={3}>{t('bulletin.metrics.title')}</Typography.Title><BulletinMetricsPanel state={state.metrics} /></section>
    <BulletinEditor draft={state.draft} dependencies={state.dependencies} saving={state.command === 'saving'}
      onClose={actions.close} onSave={() => void actions.save()} onChange={actions.updateDraft} />
  </div>;
}
