/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Empty, Skeleton, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import { alertGroupPageSizes, type AlertGroupConverge } from '../alert-group-model';
import type { AlertGroupDetailState, AlertGroupListState } from '../alert-group-state';

export function AlertGroupResults({
  state,
  columns,
  pageIndex,
  pageSize,
  changePage,
  retry
}: {
  state: AlertGroupListState;
  columns: ColumnsType<AlertGroupConverge>;
  pageIndex: number;
  pageSize: number;
  changePage: (page: number, pageSize: number) => void;
  retry: () => unknown;
}) {
  const { t } = useTranslation();
  if (state.kind === 'unavailable') return <Failure message={t('common.unavailable')} retry={retry} />;
  if (state.kind === 'error') return <Failure message={t('common.routeError.description')} retry={retry} />;
  if (state.kind === 'empty') return <Empty description={t('alertGroups.empty')} />;
  const records = state.kind === 'ready' ? state.records : [];
  const total = state.kind === 'ready' ? state.total : 0;
  return (
    <Table<AlertGroupConverge>
      rowKey="id"
      size="small"
      loading={state.kind === 'loading'}
      dataSource={records}
      columns={columns}
      scroll={{ x: 1100 }}
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
  return <Failure message={message} retry={retry} />;
}

function Failure({ message, retry }: { message: string; retry: () => unknown }) {
  const { t } = useTranslation();
  return (
    <Alert
      type="error"
      showIcon
      message={message}
      action={
        <Button size="small" onClick={() => void retry()}>
          {t('common.retry')}
        </Button>
      }
    />
  );
}
