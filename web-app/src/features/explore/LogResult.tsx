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

import { Alert, Button, Descriptions, Drawer, Empty, Table, Tag, Typography } from 'antd';
import type { TFunction } from 'i18next';
import { useEffect, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';

import type { PageResult } from '@/core/http/api-message';

import { logBody, logServiceName, logTimestampMs, type LogRow } from './explore-contract';
import { buildCrossSignalPath, buildExplorePath, buildLogStreamPath, type ExploreQuery } from './explore-model';
import styles from './LogResult.module.css';

const MAX_STREAM_ROWS = 500;

export function LogResult({ data, query, t, navigate }: {
  data?: PageResult<LogRow> | undefined;
  query: ExploreQuery;
  t: TFunction;
  navigate: NavigateFunction;
}) {
  if (query.live) {
    const streamPath = buildLogStreamPath(query);
    return <LogStreamResult key={streamPath} streamPath={streamPath} query={query} t={t} navigate={navigate} />;
  }
  const rows = data?.content ?? [];
  if (rows.length === 0) return <Empty description={t('explore.empty.logs')} />;
  return <LogRows rows={rows} data={data} query={query} t={t} navigate={navigate} />;
}

function LogStreamResult({ streamPath, query, t, navigate }: { streamPath: string; query: ExploreQuery; t: TFunction; navigate: NavigateFunction }) {
  const stream = useLogStream(streamPath);
  return (
    <div className={styles.workspace}>
      {stream.failed && <Alert type="error" showIcon title={t('exploreLog.streamFailed')} />}
      <div className={styles.streamStatus}><i data-connected={stream.connected} />{t(stream.connected ? 'exploreLog.connected' : 'exploreLog.connecting')}<span>{stream.rows.length}</span></div>
      {stream.rows.length === 0
        ? <Empty description={t('exploreLog.waiting')} />
        : <LogRows rows={stream.rows} query={query} t={t} navigate={navigate} />}
    </div>
  );
}

function LogRows({ rows, data, query, t, navigate }: {
  rows: LogRow[];
  data?: PageResult<LogRow> | undefined;
  query: ExploreQuery;
  t: TFunction;
  navigate: NavigateFunction;
}) {
  const [selected, setSelected] = useState<LogRow>();

  return (
    <div className={styles.workspace}>
      <Table<LogRow>
          rowKey={row => `${row.timeUnixNano ?? row.observedTimeUnixNano ?? 'log'}-${row.traceId ?? ''}-${row.spanId ?? ''}`}
          size="small"
          dataSource={rows}
          pagination={data ? {
            current: (data?.number ?? 0) + 1,
            pageSize: data?.size ?? 20,
            total: data?.totalElements ?? rows.length,
            hideOnSinglePage: true,
            showSizeChanger: false,
            onChange: page => { void navigate(buildExplorePath({ ...query, pageIndex: page - 1 || undefined })); }
          } : false}
          scroll={{ x: 980, y: 520 }}
          onRow={row => ({ onClick: () => setSelected(row) })}
          columns={[
            { title: t('explore.time'), width: 190, render: (_, row) => formatLogTime(row) },
            { title: t('explore.severity'), width: 100, render: (_, row) => <Tag color={severityColor(row.severityText)}>{row.severityText ?? '—'}</Tag> },
            { title: t('explore.service'), width: 170, render: (_, row) => logServiceName(row) ?? '—' },
            { title: t('explore.message'), ellipsis: true, render: (_, row) => logBody(row) ?? '—' },
            { title: t('explore.trace'), width: 190, render: (_, row) => row.traceId ? <Button className={styles.traceLink ?? ''} type="link" onClick={event => { event.stopPropagation(); void navigate(buildCrossSignalPath(query, 'traces', { traceId: row.traceId })); }}>{shortId(row.traceId)}</Button> : '—' }
          ]}
      />
      <LogDetail row={selected} t={t} query={query} navigate={navigate} onClose={() => setSelected(undefined)} />
    </div>
  );
}

function LogDetail({ row, t, query, navigate, onClose }: { row?: LogRow | undefined; t: TFunction; query: ExploreQuery; navigate: NavigateFunction; onClose: () => void }) {
  return (
    <Drawer size="large" open={Boolean(row)} title={t('exploreLog.detail')} onClose={onClose} extra={row?.traceId ? <Button onClick={() => { void navigate(buildCrossSignalPath(query, 'traces', { traceId: row.traceId })); }}>{t('exploreLog.openTrace')}</Button> : undefined}>
      {row && <>
        <Typography.Paragraph className={styles.body ?? ''}>{logBody(row) ?? '—'}</Typography.Paragraph>
        <Descriptions column={1} size="small" bordered items={[
          { key: 'time', label: t('explore.time'), children: formatLogTime(row) },
          { key: 'severity', label: t('explore.severity'), children: row.severityText ?? '—' },
          { key: 'trace', label: 'Trace ID', children: row.traceId ?? '—' },
          { key: 'span', label: 'Span ID', children: row.spanId ?? '—' }
        ]} />
        <AttributeBlock title={t('exploreLog.resourceAttributes')} value={row.resource} />
        <AttributeBlock title={t('exploreLog.logAttributes')} value={row.attributes} />
      </>}
    </Drawer>
  );
}

function AttributeBlock({ title, value }: { title: string; value?: Record<string, unknown> | undefined }) {
  return <section className={styles.attributes}><Typography.Title level={5}>{title}</Typography.Title><pre>{JSON.stringify(value ?? {}, null, 2)}</pre></section>;
}

function useLogStream(streamPath: string) {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [connected, setConnected] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const source = new EventSource(streamPath);
    source.onopen = () => setConnected(true);
    source.onerror = () => { setConnected(false); setFailed(true); };
    source.addEventListener('LOG_EVENT', event => {
      try {
        const row = JSON.parse((event as MessageEvent<string>).data) as LogRow;
        setRows(current => [row, ...current].slice(0, MAX_STREAM_ROWS));
      } catch {
        setFailed(true);
      }
    });
    return () => source.close();
  }, [streamPath]);

  return { rows, connected, failed };
}

function formatLogTime(row: LogRow) {
  const timestamp = logTimestampMs(row);
  return timestamp == null ? '—' : new Date(timestamp).toLocaleString();
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
