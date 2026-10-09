/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import {
  OperationalPage,
  OperationalPageHeader,
  OperationalResultRegion,
  OperationalStatePanel
} from '@/shared/operational-page';

import { entityPageSizes, type EntitySummary } from '../model/entity-contract';
import { localizeEntityCode } from '../model/entity-display';
import type { EntityListViewActions, EntityListViewState } from '../model/entity-view-model';
import styles from './entity-view.module.css';
import { EntityFilters } from './entity-list-filters';

export type EntityListViewProps = { state: EntityListViewState; actions: EntityListViewActions };

export function EntityListView({ state, actions }: EntityListViewProps) {
  const { t } = useTranslation();
  return (
    <OperationalPage>
      <OperationalPageHeader
        title={t('entity.title')}
        description={t('entity.description')}
        actions={
          <Space wrap>
            <Button type="primary" onClick={actions.discover}>
              {t('entity.discovery.action')}
            </Button>
            {state.canWrite ? (
              <>
                <Button onClick={actions.importDefinitions}>{t('entity.import.action')}</Button>
                <Button onClick={actions.create}>{t('entity.editor.addTitle')}</Button>
              </>
            ) : null}
            <Button disabled={state.refreshing} onClick={actions.refresh}>
              {t('common.refresh')}
            </Button>
          </Space>
        }
      />
      <EntityFilters state={state} actions={actions} />
      <OperationalResultRegion>
        <EntityResults state={state} actions={actions} />
      </OperationalResultRegion>
    </OperationalPage>
  );
}

function EntityResults({ state, actions }: EntityListViewProps) {
  const { t } = useTranslation();
  const evidence = state.evidence;
  if (evidence.kind === 'loading') return <OperationalStatePanel kind="loading" title={t('entity.loading')} />;
  if (evidence.kind === 'empty') return <OperationalStatePanel kind="no-match" title={t('entity.empty')} />;
  if (evidence.kind === 'permission')
    return <OperationalStatePanel kind="permission" title={t('common.permission.roleRequiredDescription')} />;
  if (evidence.kind === 'unavailable')
    return <OperationalStatePanel kind="unavailable" title={t('common.unavailable')} />;
  if (evidence.kind === 'error')
    return <OperationalStatePanel kind="error" title={t('common.routeError.description')} />;
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
        showTotal: total => t('entity.results.total', { count: total }),
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
