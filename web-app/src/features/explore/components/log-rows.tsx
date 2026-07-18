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

import { Button, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { useState, type ReactNode } from 'react';

import type { ExplorePageResult, LogRow } from '../model/explore-signal-contract';
import { buildCrossSignalPath, buildExplorePath, type LogExploreQuery } from '../model/explore-model';
import { logBody, logServiceName } from '../model/explore-signal-model';
import { interactiveTableRow } from './interactive-table-row';
import { LogDetail } from './log-detail';
import { formatLogTime } from './log-display';
import styles from './log-result.module.css';
import { SignalResultFrame } from './signal-result-frame';

type Navigate = (path: string) => void;

export function LogRows({
  rows,
  data,
  query,
  t,
  navigate,
  live,
  connection,
  actions,
}: {
  rows: LogRow[];
  data?: ExplorePageResult<LogRow> | undefined;
  query: LogExploreQuery;
  t: TFunction;
  navigate: Navigate;
  live?: boolean | undefined;
  connection?: ReactNode | undefined;
  actions?: ReactNode | undefined;
}) {
  const [selected, setSelected] = useState<LogRow>();

  return (
    <SignalResultFrame
      title={t(live ? 'exploreLog.live' : 'explore.signals.logs')}
      count={data?.totalElements ?? rows.length}
      meta={live ? [{ label: t('exploreLog.streamStatus'), value: connection }] : []}
      actions={actions}
    >
      <Table<LogRow>
        className={styles.clickableTable ?? ''}
        rowKey={(row) =>
          `${row.timeUnixNano ?? row.observedTimeUnixNano ?? 'log'}-${row.traceId ?? ''}-${row.spanId ?? ''}`
        }
        size="small"
        virtual
        dataSource={rows}
        pagination={logPagination(data, query, navigate)}
        scroll={{ x: 980, y: 520 }}
        onRow={(row) => interactiveTableRow(() => setSelected(row))}
        columns={logColumns(t, query, navigate)}
      />
      <LogDetail row={selected} t={t} query={query} navigate={navigate} onClose={() => setSelected(undefined)} />
    </SignalResultFrame>
  );
}

function logColumns(t: TFunction, query: LogExploreQuery, navigate: Navigate): ColumnsType<LogRow> {
  return [
    { title: t('explore.time'), width: 190, render: (_, row) => formatLogTime(row) },
    {
      title: t('explore.severity'),
      width: 100,
      render: (_, row) => <Tag color={severityColor(row.severityText ?? undefined)}>{row.severityText ?? '—'}</Tag>,
    },
    { title: t('explore.service'), width: 170, render: (_, row) => logServiceName(row) ?? '—' },
    { title: t('explore.message'), ellipsis: true, render: (_, row) => logBody(row) ?? '—' },
    {
      title: t('explore.trace'),
      width: 190,
      render: (_, row) => row.traceId ? (
        <Button
          className={styles.traceLink ?? ''}
          type="link"
          onClick={(event) => {
            event.stopPropagation();
            void navigate(buildCrossSignalPath(query, 'traces', { traceId: row.traceId ?? undefined }));
          }}
        >
          {shortId(row.traceId)}
        </Button>
      ) : '—',
    },
  ];
}

function logPagination(data: ExplorePageResult<LogRow> | undefined, query: LogExploreQuery, navigate: Navigate) {
  if (!data) return false as const;
  return {
    current: data.number + 1,
    pageSize: data.size,
    total: data.totalElements,
    hideOnSinglePage: true,
    showSizeChanger: false,
    onChange: (page: number) => {
      void navigate(buildExplorePath({ ...query, pageIndex: page - 1 || undefined }));
    },
  };
}

function shortId(value: string) {
  return value.length > 20 ? `${value.slice(0, 8)}…${value.slice(-8)}` : value;
}

function severityColor(severity?: string) {
  const normalized = severity?.toUpperCase() ?? '';
  if (normalized.includes('ERROR') || normalized.includes('FATAL')) return 'red';
  if (normalized.includes('WARN')) return 'gold';
  if (normalized.includes('INFO')) return 'blue';
  return 'default';
}
