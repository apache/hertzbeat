/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Badge, Button, Empty, Input, Select, Space, Spin, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { entityPageSizes, entitySortFields, type EntitySummary } from '../model/entity-contract';
import { localizeEntityCode } from '../model/entity-display';
import type { EntityListViewActions, EntityListViewState } from '../model/entity-view-model';
import styles from './entity-view.module.css';

export type EntityListViewProps = { state: EntityListViewState; actions: EntityListViewActions };
const advancedFilterKeys = ['owner', 'source', 'lifecycle', 'tier', 'system'] as const;

export function EntityListView({ state, actions }: EntityListViewProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t('entity.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('entity.description')}</Typography.Text>
        </div>
        <Space>
          <Button type="primary" onClick={actions.create}>
            {t('entity.editor.addTitle')}
          </Button>
          <Button disabled={state.refreshing} onClick={actions.refresh}>
            {t('common.refresh')}
          </Button>
        </Space>
      </header>
      <EntityFilters state={state} actions={actions} />
      <EntityResults state={state} actions={actions} />
    </div>
  );
}

function EntityFilters({ state, actions }: EntityListViewProps) {
  const { t } = useTranslation();
  const [advanced, setAdvanced] = useState(false);
  const advancedCount = advancedFilterKeys.filter(key => state.query[key].length > 0).length;
  return (
    <div className={styles.filterStack}>
      <div className={styles.filters}>
        <Input.Search
          allowClear
          value={state.draft}
          placeholder={t('entity.filters.search')}
          onChange={event => actions.updateDraft(event.target.value)}
          onSearch={actions.submit}
        />
        <FilterInput filter="type" state={state} actions={actions} />
        <FilterInput filter="status" state={state} actions={actions} />
        <FilterInput filter="environment" state={state} actions={actions} />
        <SortFields state={state} actions={actions} />
        <Badge count={advancedCount} size="small">
          <Button onClick={() => setAdvanced(value => !value)}>
            {t(advanced ? 'entity.filters.hideAdvanced' : 'entity.filters.showAdvanced')}
          </Button>
        </Badge>
      </div>
      {advanced ? <AdvancedFilters state={state} actions={actions} /> : null}
    </div>
  );
}

function AdvancedFilters({ state, actions }: EntityListViewProps) {
  return (
    <div className={styles.advancedFilters}>
      {advancedFilterKeys.map(filter => (
        <FilterInput key={filter} filter={filter} state={state} actions={actions} />
      ))}
    </div>
  );
}

function FilterInput({
  filter,
  state,
  actions
}: EntityListViewProps & { filter: Parameters<EntityListViewActions['changeFilter']>[0] }) {
  const { t } = useTranslation();
  return (
    <Input
      allowClear
      value={state.query[filter]}
      aria-label={t(`entity.filters.${filter}`)}
      placeholder={t(`entity.filters.${filter}`)}
      onChange={event => actions.changeFilter(filter, event.target.value.trim())}
    />
  );
}

function SortFields({ state, actions }: EntityListViewProps) {
  const { t } = useTranslation();
  return (
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
    {
      title: t('entity.fields.type'),
      dataIndex: 'type',
      render: (value: string) => <Tag>{localizeEntityCode(t, 'type', value)}</Tag>
    },
    {
      title: t('entity.fields.status'),
      dataIndex: 'status',
      render: (value?: string) => <Tag>{localizeEntityCode(t, 'status', value)}</Tag>
    },
    { title: t('entity.fields.environment'), dataIndex: 'environment', render: (value?: string) => value || '—' },
    { title: t('entity.fields.owner'), dataIndex: 'owner', render: (value?: string) => value || '—' },
    { title: t('entity.fields.monitors'), dataIndex: 'monitorCount', align: 'right' },
    { title: t('entity.fields.relations'), dataIndex: 'relationCount', align: 'right' },
    { title: t('entity.fields.alerts'), dataIndex: 'activeAlertCount', align: 'right' }
  ];
}
