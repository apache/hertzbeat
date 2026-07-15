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

import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Empty, Input, Select, Skeleton, Space, Table, Tag, Typography } from 'antd';
import type { FormEvent } from 'react';
import { useMemo } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { apiMessageGet, type PageResult } from '@/core/http/api-message';

import {
  buildCrossSignalPath,
  buildExplorePath,
  buildSignalApiPath,
  EXPLORE_TIME_RANGES,
  parseExploreQuery,
  type ExploreQuery,
  type ExploreSignal,
  type ExploreTimeRange
} from './explore-model';
import styles from './ExplorePage.module.css';

type TraceRow = {
  traceId?: string;
  serviceName?: string;
  operationName?: string;
  durationMs?: number;
  status?: string;
  error?: boolean;
};

type LogRow = {
  time?: number | string;
  timestamp?: number | string;
  severityText?: string;
  serviceName?: string;
  body?: string;
  traceId?: string;
};

type MetricConsole = {
  series?: MetricSeries[];
};

type MetricSeries = { name?: string; metric?: string; labels?: Record<string, string>; points?: unknown[] };

type SignalData = PageResult<TraceRow | LogRow> | MetricConsole;

const signalKeys: ExploreSignal[] = ['metrics', 'logs', 'traces'];

export function ExplorePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parseExploreQuery(searchParams), [searchParams]);
  const result = useQuery({
    queryKey: ['explore', query],
    queryFn: () => apiMessageGet<SignalData>(buildSignalApiPath(query)),
    staleTime: 5_000
  });

  const updateQuery = (changes: Partial<ExploreQuery>) => {
    const next = { ...query, ...changes };
    setSearchParams(new URL(buildExplorePath(next), window.location.origin).searchParams);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateQuery({
      serviceName: readFormValue(event.currentTarget, 'serviceName'),
      environment: readFormValue(event.currentTarget, 'environment'),
      query: readFormValue(event.currentTarget, 'query')
    });
  };

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <Typography.Title level={2}>{t('explore.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('explore.description')}</Typography.Text>
      </header>

      <div className={styles.context} aria-label={t('explore.context')}>
        <Space wrap>
          <Tag color="blue">{t(`explore.signals.${query.signal}`)}</Tag>
          {query.serviceName && <Tag>{t('explore.serviceContext', { value: query.serviceName })}</Tag>}
          {query.environment && <Tag>{t('explore.environmentContext', { value: query.environment })}</Tag>}
          <Tag>{t(`explore.timeRanges.${query.timeRange}`)}</Tag>
        </Space>
      </div>

      <Space.Compact block>
        {signalKeys.map(signal => (
          <Button key={signal} type={query.signal === signal ? 'primary' : 'default'} onClick={() => updateQuery({ signal })}>
            {t(`explore.signals.${signal}`)}
          </Button>
        ))}
      </Space.Compact>

      <form className={styles.toolbar} onSubmit={onSubmit}>
        <Select
          aria-label={t('explore.timeRange')}
          value={query.timeRange}
          options={EXPLORE_TIME_RANGES.map(value => ({ value, label: t(`explore.timeRanges.${value}`) }))}
          onChange={(value: ExploreTimeRange) => updateQuery({ timeRange: value })}
        />
        <Input name="serviceName" defaultValue={query.serviceName} placeholder={t('explore.serviceName')} />
        <Input name="environment" defaultValue={query.environment} placeholder={t('explore.environment')} />
        <Input name="query" defaultValue={query.query} placeholder={t(`explore.queryPlaceholders.${query.signal}`)} />
        <Button type="primary" htmlType="submit">{t('common.query')}</Button>
      </form>

      <section className={styles.results} aria-live="polite">
        {result.isPending && <Skeleton active paragraph={{ rows: 8 }} />}
        {result.isError && <Alert type="error" showIcon message={t('explore.loadFailed')} action={<Button onClick={() => void result.refetch()}>{t('common.retry')}</Button>} />}
        {result.isSuccess && renderResult(result.data, query, t, navigate)}
      </section>
    </div>
  );
}

function renderResult(data: SignalData, query: ExploreQuery, t: TFunction, navigate: ReturnType<typeof useNavigate>) {
  if (query.signal === 'metrics') return <MetricResult data={data as MetricConsole} t={t} />;
  if (query.signal === 'logs') return <LogResult data={data as PageResult<LogRow>} query={query} t={t} navigate={navigate} />;
  return <TraceResult data={data as PageResult<TraceRow>} query={query} t={t} navigate={navigate} />;
}

function MetricResult({ data, t }: { data: MetricConsole; t: TFunction }) {
  const rows = data.series ?? [];
  if (rows.length === 0) return <Empty description={t('explore.empty.metrics')} />;
  return <Table rowKey={(row, index) => `${row.name ?? row.metric ?? 'series'}-${index}`} dataSource={rows} pagination={false} columns={[
    { title: t('explore.metric'), render: (_: unknown, row: MetricSeries) => row.name ?? row.metric ?? '—' },
    { title: t('explore.samples'), render: (_: unknown, row: MetricSeries) => row.points?.length ?? 0 },
    { title: t('explore.labels'), render: (_: unknown, row: MetricSeries) => Object.entries(row.labels ?? {}).map(([key, value]) => `${key}=${value}`).join(', ') || '—' }
  ]} />;
}

function LogResult({ data, query, t, navigate }: { data: PageResult<LogRow>; query: ExploreQuery; t: TFunction; navigate: ReturnType<typeof useNavigate> }) {
  const rows = data.content ?? [];
  if (rows.length === 0) return <Empty description={t('explore.empty.logs')} />;
  return <Table rowKey={(_, index) => String(index)} dataSource={rows} pagination={false} columns={[
    { title: t('explore.time'), render: (_: unknown, row: LogRow) => row.time ?? row.timestamp ?? '—' },
    { title: t('explore.severity'), dataIndex: 'severityText' },
    { title: t('explore.service'), dataIndex: 'serviceName' },
    { title: t('explore.message'), dataIndex: 'body' },
    { title: t('explore.trace'), render: (_: unknown, row: LogRow) => row.traceId ? <Button className={styles.tableLink ?? ''} type="link" onClick={() => { void navigate(buildCrossSignalPath(query, 'traces', { traceId: row.traceId })); }}>{row.traceId}</Button> : '—' }
  ]} />;
}

function TraceResult({ data, query, t, navigate }: { data: PageResult<TraceRow>; query: ExploreQuery; t: TFunction; navigate: ReturnType<typeof useNavigate> }) {
  const rows = data.content ?? [];
  if (rows.length === 0) return <Empty description={t('explore.empty.traces')} />;
  return <Table rowKey={row => row.traceId ?? row.operationName ?? Math.random()} dataSource={rows} pagination={false} columns={[
    { title: t('explore.trace'), render: (_: unknown, row: TraceRow) => row.traceId ?? '—' },
    { title: t('explore.service'), dataIndex: 'serviceName' },
    { title: t('explore.operation'), dataIndex: 'operationName' },
    { title: t('explore.duration'), render: (_: unknown, row: TraceRow) => row.durationMs == null ? '—' : `${row.durationMs} ms` },
    { title: t('explore.relatedLogs'), render: (_: unknown, row: TraceRow) => row.traceId ? <Button className={styles.tableLink ?? ''} type="link" onClick={() => { void navigate(buildCrossSignalPath(query, 'logs', { traceId: row.traceId })); }}>{t('explore.open')}</Button> : '—' }
  ]} />;
}

function readFormValue(form: HTMLFormElement, name: string) {
  const value = new FormData(form).get(name);
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
