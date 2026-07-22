/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Empty, Input, Select, Space, Spin, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import { entityPageSizes, entitySortFields, type EntitySummary } from '../model/entity-contract';
import type { EntityListViewActions, EntityListViewState } from '../model/entity-view-model';
import styles from './entity-view.module.css';

export type EntityListViewProps = { state: EntityListViewState; actions: EntityListViewActions };

export function EntityListView({ state, actions }: EntityListViewProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t('entity.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('entity.description')}</Typography.Text>
        </div>
        <Button disabled={state.refreshing} onClick={actions.refresh}>
          {t('common.refresh')}
        </Button>
      </header>
      <EntityFilters state={state} actions={actions} />
      <EntityResults state={state} actions={actions} />
    </div>
  );
}

function EntityFilters({ state, actions }: EntityListViewProps) {
  const { t } = useTranslation();
  const filterKeys = ['type', 'status', 'owner', 'source', 'environment', 'lifecycle', 'tier', 'system'] as const;
  return (
    <div className={styles.filters}>
      <Input.Search
        allowClear
        value={state.draft}
        placeholder={t('entity.filters.search')}
        onChange={event => actions.updateDraft(event.target.value)}
        onSearch={actions.submit}
      />
      {filterKeys.map(key => (
        <Input
          key={key}
          allowClear
          value={state.query[key]}
          aria-label={t(`entity.filters.${key}`)}
          placeholder={t(`entity.filters.${key}`)}
          onChange={event => actions.changeFilter(key, event.target.value.trim())}
        />
      ))}
      <Space.Compact>
        <Select
          aria-label={t('entity.sort.field')}
          value={state.query.sort}
          options={entitySortFields.map(value => ({ value, label: t(`entity.sort.${value}`) }))}
          onChange={sort => actions.changeSort(sort, state.query.order)}
        />
        <Select
          aria-label={t('entity.sort.order')}
          value={state.query.order}
          options={['asc', 'desc'].map(value => ({ value, label: t(`entity.sort.${value}`) }))}
          onChange={order => actions.changeSort(state.query.sort, order)}
        />
      </Space.Compact>
    </div>
  );
}

function EntityResults({ state, actions }: EntityListViewProps) {
  const { t } = useTranslation();
  const evidence = state.evidence;
  if (evidence.kind === 'loading')
    return (
      <div role="status">
        <Spin />
      </div>
    );
  if (evidence.kind === 'empty') return <Empty description={t('entity.empty')} />;
  if (evidence.kind === 'unavailable') return <Alert showIcon type="warning" message={t('common.unavailable')} />;
  if (evidence.kind === 'error') return <Alert showIcon type="error" message={t('common.routeError.description')} />;
  return (
    <Table<EntitySummary>
      rowKey="id"
      size="small"
      dataSource={evidence.records}
      columns={columns(t, actions.open)}
      pagination={{
        current: state.query.pageIndex + 1,
        pageSize: state.query.pageSize,
        pageSizeOptions: [...entityPageSizes],
        showSizeChanger: true,
        total: evidence.total,
        onChange: actions.changePage
      }}
    />
  );
}

function columns(t: (key: string) => string, open: (id: number) => void): ColumnsType<EntitySummary> {
  return [
    {
      title: t('entity.fields.name'),
      dataIndex: 'name',
      render: (_value, row) => (
        <Button type="link" className={styles.rowLink!} onClick={() => open(row.id)}>
          {row.displayName || row.name}
        </Button>
      )
    },
    { title: t('entity.fields.type'), dataIndex: 'type', render: (value: string) => <Tag>{value}</Tag> },
    {
      title: t('entity.fields.status'),
      dataIndex: 'status',
      render: (value?: string) => (value ? <Tag>{value}</Tag> : '—')
    },
    { title: t('entity.fields.environment'), dataIndex: 'environment', render: (value?: string) => value || '—' },
    { title: t('entity.fields.owner'), dataIndex: 'owner', render: (value?: string) => value || '—' },
    { title: t('entity.fields.monitors'), dataIndex: 'monitorCount', align: 'right' },
    { title: t('entity.fields.relations'), dataIndex: 'relationCount', align: 'right' },
    { title: t('entity.fields.alerts'), dataIndex: 'activeAlertCount', align: 'right' }
  ];
}
