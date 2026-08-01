/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

import { noticeRulePageSizes, type NoticeRule, type NoticeRuleListState } from '../model/notice-rule-model';
import type { NoticeRuleActionCapabilities } from '../model/notice-rule-action-capability';
import { buildNoticeRuleTableColumns, type NoticeRuleTableColumnActions } from './notice-rule-table-columns';

type NoticeRuleTableActions = NoticeRuleTableColumnActions & {
  changePage: (page: number, pageSize: number) => void;
};

type NoticeRuleTableProps = {
  actions: NoticeRuleTableActions;
  busy: boolean;
  capabilities: NoticeRuleActionCapabilities;
  dependenciesReady: boolean;
  pageIndex: number;
  pageSize: number;
  state: NoticeRuleListState;
  togglingRuleId: number | null;
};

export function NoticeRuleTable(props: NoticeRuleTableProps) {
  const { t } = useTranslation();
  return (
    <NoticeRuleResults
      {...props}
      columns={buildNoticeRuleTableColumns({
        actions: props.actions,
        busy: props.busy,
        capabilities: props.capabilities,
        dependenciesReady: props.dependenciesReady,
        t,
        togglingRuleId: props.togglingRuleId
      })}
    />
  );
}

function NoticeRuleResults({
  state,
  columns,
  pageIndex,
  pageSize,
  actions,
  busy
}: NoticeRuleTableProps & {
  columns: ColumnsType<NoticeRule>;
}) {
  const { t } = useTranslation();
  if (state.kind === 'loading') return <OperationalStatePanel kind="loading" title={t('noticeRules.loading')} />;
  if (state.kind === 'empty') return <OperationalStatePanel kind="empty" title={t('noticeRules.empty')} />;
  if (state.kind === 'invalid' || state.kind === 'unavailable' || state.kind === 'error') {
    return (
      <OperationalStatePanel
        kind={state.kind === 'unavailable' ? 'unavailable' : 'error'}
        title={t(`noticeRules.read.${state.kind}`)}
      />
    );
  }
  if (state.records.length === 0) return <OperationalStatePanel kind="empty" title={t('noticeRules.empty')} />;
  return (
    <Table<NoticeRule>
      rowKey="id"
      size="small"
      dataSource={state.records}
      columns={columns}
      scroll={{ x: 1460 }}
      pagination={{
        disabled: busy,
        current: pageIndex + 1,
        pageSize,
        pageSizeOptions: [...noticeRulePageSizes],
        showSizeChanger: true,
        total: state.total,
        onChange: actions.changePage
      }}
    />
  );
}
