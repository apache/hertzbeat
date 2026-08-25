/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Skeleton, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel, OperationalTableEmptyState } from '@/shared/operational-page/operational-page';
import { pageSelectionLabels, pageSelectionTitleCheckboxProps } from '@/shared/table-selection';

import { alertGroupPageSizes, type AlertGroupConverge } from '../model/alert-group-model';
import { alertPolicyTableViewport } from '../model/alert-policy-table-viewport';
import type { AlertGroupDetailState, AlertGroupListState } from '../model/alert-group-state';
import styles from '../shared/alert-policy-page.module.css';

export function AlertGroupResults({
  state,
  columns,
  pageIndex,
  pageSize,
  busy,
  canDelete,
  selectedIds,
  selectIds,
  changePage,
  retry
}: {
  state: AlertGroupListState;
  columns: ColumnsType<AlertGroupConverge>;
  pageIndex: number;
  pageSize: number;
  busy: boolean;
  canDelete: boolean;
  selectedIds: number[];
  selectIds: (ids: number[]) => void;
  changePage: (page: number, pageSize: number) => void;
  retry: () => unknown;
}) {
  const { t } = useTranslation();
  if (state.kind === 'unavailable')
    return <Failure kind="unavailable" message={t('common.unavailable')} retry={retry} />;
  if (state.kind === 'error')
    return <Failure kind="error" message={t('common.routeError.description')} retry={retry} />;
  const records = state.kind === 'ready' ? state.records : [];
  const total = state.kind === 'ready' ? state.total : 0;
  const viewport = alertPolicyTableViewport(records.length, 1100);
  const rowSelection: TableRowSelection<AlertGroupConverge> = {
    selectedRowKeys: selectedIds,
    getTitleCheckboxProps: () =>
      pageSelectionTitleCheckboxProps(
        selectedIds,
        records.map(record => record.id),
        pageSelectionLabels(t)
      ),
    getCheckboxProps: () => ({ disabled: busy }),
    onChange: keys => selectIds(keys.flatMap(key => (typeof key === 'number' ? [key] : [])))
  };
  return (
    <Table<AlertGroupConverge>
      rowKey="id"
      className={styles.tableHeaderNoWrap!}
      data-table-overflow={viewport.mode}
      size="small"
      loading={state.kind === 'loading'}
      dataSource={records}
      columns={columns}
      locale={{
        emptyText: state.kind === 'empty' ? <OperationalTableEmptyState title={t('alertGroups.empty')} /> : null
      }}
      {...(canDelete ? { rowSelection } : {})}
      scroll={viewport.scroll}
      pagination={{
        current: pageIndex + 1,
        pageSize,
        pageSizeOptions: [...alertGroupPageSizes],
        showSizeChanger: true,
        total,
        onChange: changePage
      }}
    />
  );
}

export function AlertGroupDetailFailure({ state, retry }: { state: AlertGroupDetailState; retry: () => unknown }) {
  const { t } = useTranslation();
  if (state.kind === 'idle') return null;
  if (state.kind === 'loading') return <Skeleton active paragraph={false} />;
  let message = t('alertGroups.loadFailed');
  if (state.kind === 'missing') message = t('common.notFound.description');
  if (state.kind === 'unavailable') message = t('common.unavailable');
  return <Failure kind={state.kind === 'unavailable' ? 'unavailable' : 'error'} message={message} retry={retry} />;
}

function Failure({ kind, message, retry }: { kind: 'unavailable' | 'error'; message: string; retry: () => unknown }) {
  const { t } = useTranslation();
  return (
    <OperationalStatePanel
      kind={kind}
      title={message}
      action={
        <Button size="small" onClick={() => void retry()}>
          {t('common.retry')}
        </Button>
      }
    />
  );
}
