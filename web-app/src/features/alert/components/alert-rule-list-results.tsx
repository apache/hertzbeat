/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Button, Grid, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel, OperationalTableEmptyState } from '@/shared/operational-page/operational-page';
import { pageSelectionLabels, pageSelectionTitleCheckboxProps } from '@/shared/table-selection';

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
  const screens = Grid.useBreakpoint();
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
  const records = props.state.kind === 'ready' ? props.state.records : [];
  const total = props.state.kind === 'ready' ? props.state.total : 0;
  return (
    <Table<AlertRule>
      rowKey="id"
      size="small"
      tableLayout="fixed"
      loading={props.state.kind === 'loading'}
      dataSource={records}
      columns={responsiveColumns(props.columns, Boolean(screens.lg))}
      locale={{
        emptyText: <OperationalTableEmptyState title={t('alertRules.empty')} />
      }}
      rowSelection={{
        fixed: Boolean(screens.lg),
        columnWidth: 32,
        selectedRowKeys: props.selectedIds,
        getTitleCheckboxProps: () =>
          pageSelectionTitleCheckboxProps(
            props.selectedIds,
            records.map(record => record.id),
            pageSelectionLabels(t)
          ),
        getCheckboxProps: () => ({ disabled: props.busy }),
        onChange: keys => {
          if (!props.busy) props.selectIds(keys.filter((key): key is number => typeof key === 'number'));
        }
      }}
      scroll={{ x: 1462 }}
      pagination={listPagination(props, total)}
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

function responsiveColumns(columns: ColumnsType<AlertRule>, pinned: boolean): ColumnsType<AlertRule> {
  return columns.map(column => ({ ...column, fixed: pinned ? (column.fixed ?? false) : false }));
}

function listPagination(props: AlertRuleListResultsProps, total: number) {
  return {
    current: props.pageIndex + 1,
    pageSize: props.pageSize,
    pageSizeOptions: [...alertRulePageSizes],
    showSizeChanger: true,
    total,
    disabled: props.busy,
    onChange: props.changePage
  };
}
