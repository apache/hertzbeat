/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page/operational-page';

import { alertRulePageSizes, type AlertRule, type AlertRuleListState } from '../model/alert-rule-model';

type AlertRuleListResultsProps = {
  state: AlertRuleListState;
  columns: ColumnsType<AlertRule>;
  pageIndex: number;
  pageSize: number;
  busy: boolean;
  selectedIds: number[];
  selectIds: (ids: number[]) => void;
  retryDisabled: boolean;
  changePage: (page: number, pageSize: number) => void;
  retry: () => unknown;
};

export function AlertRuleListResults(props: AlertRuleListResultsProps) {
  const { t } = useTranslation();
  if (props.state.kind === 'unavailable') {
    return (
      <ListFailure
        kind="unavailable"
        message={t('common.unavailable')}
        retry={props.retry}
        disabled={props.retryDisabled}
      />
    );
  }
  if (props.state.kind === 'error') {
    return (
      <ListFailure
        kind="error"
        message={t('common.routeError.description')}
        retry={props.retry}
        disabled={props.retryDisabled}
      />
    );
  }
  if (props.state.kind === 'empty') return <OperationalStatePanel kind="empty" title={t('alertRules.empty')} />;
  const records = props.state.kind === 'ready' ? props.state.records : [];
  const total = props.state.kind === 'ready' ? props.state.total : 0;
  return (
    <Table<AlertRule>
      rowKey="id"
      size="small"
      loading={props.state.kind === 'loading'}
      dataSource={records}
      columns={props.columns}
      rowSelection={{
        selectedRowKeys: props.selectedIds,
        getCheckboxProps: () => ({ disabled: props.busy }),
        onChange: keys => {
          if (!props.busy) props.selectIds(keys.filter((key): key is number => typeof key === 'number'));
        }
      }}
      scroll={{ x: 1200 }}
      pagination={{
        current: props.pageIndex + 1,
        pageSize: props.pageSize,
        pageSizeOptions: [...alertRulePageSizes],
        showSizeChanger: true,
        total,
        disabled: props.busy,
        onChange: props.changePage
      }}
    />
  );
}

function ListFailure({
  kind,
  message,
  retry,
  disabled
}: {
  kind: 'unavailable' | 'error';
  message: string;
  retry: () => unknown;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  return (
    <OperationalStatePanel
      kind={kind}
      title={message}
      action={
        <Button size="small" disabled={disabled} onClick={() => void retry()}>
          {t('common.retry')}
        </Button>
      }
    />
  );
}
