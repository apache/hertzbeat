/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';

import type { ExplorePageResult, TraceRow } from '../model/explore-signal-contract';
import { traceDurationMs, traceHealthState } from '../model/explore-signal-model';
import { formatTraceDuration } from './trace-display';
import { interactiveTableRow } from './interactive-table-row';
import styles from './trace-result.module.css';

type Props = {
  data: ExplorePageResult<TraceRow>;
  t: TFunction;
  detailOpen: boolean;
  selectedTraceId?: string | undefined;
  openTrace: (traceId: string) => void;
  changePage: (page: number) => void;
  evidenceCurrent: boolean;
};

export function TraceTable({ data, t, detailOpen, selectedTraceId, openTrace, changePage, evidenceCurrent }: Props) {
  return (
    <Table<TraceRow>
      className={evidenceCurrent ? (styles.clickableTable ?? '') : ''}
      rowKey={row => row.traceId ?? row.rootSpanId ?? ''}
      size="small"
      dataSource={data.content ?? []}
      scroll={{ x: 900, y: 520 }}
      onRow={row => (evidenceCurrent ? interactiveTableRow(() => openTrace(row.traceId)) : {})}
      rowClassName={row => (selectedTraceId === row.traceId ? (styles.selectedRow ?? '') : '')}
      pagination={{
        current: data.number + 1,
        pageSize: data.size,
        total: data.totalElements,
        showSizeChanger: false,
        hideOnSinglePage: true,
        disabled: !evidenceCurrent,
        onChange: page => {
          if (evidenceCurrent) changePage(page);
        }
      }}
      columns={traceColumns(t, detailOpen)}
    />
  );
}

function traceColumns(t: TFunction, detailOpen: boolean): ColumnsType<TraceRow> {
  const columns: ColumnsType<TraceRow> = [
    {
      title: t('explore.time'),
      width: 190,
      render: (_, row) => (row.startTime != null ? new Date(row.startTime).toLocaleString() : '—')
    },
    { title: t('explore.service'), width: 180, dataIndex: 'serviceName' },
    { title: t('explore.operation'), dataIndex: 'rootSpanName', ellipsis: true },
    {
      title: t('explore.duration'),
      width: 120,
      render: (_, row) => formatTraceDuration(traceDurationMs(row))
    },
    {
      title: t('exploreTrace.status'),
      width: 100,
      render: (_, row) => <Tag color={traceStatusTone(row)}>{row.status ?? '—'}</Tag>
    }
  ];
  if (!detailOpen) {
    columns.push({ title: t('explore.traceId'), width: 220, dataIndex: 'traceId', ellipsis: true });
  }
  return columns;
}

function traceStatusTone(row: TraceRow) {
  switch (traceHealthState(row)) {
    case 'error':
      return 'red';
    case 'ok':
      return 'green';
    default:
      return 'default';
  }
}
