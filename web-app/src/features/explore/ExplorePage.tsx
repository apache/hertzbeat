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

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { Alert, Button, Empty, Input, Select, Skeleton, Space, Table, Tag, Typography } from 'antd';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { apiMessageGet, type PageResult } from '@/core/http/api-message';

import { traceDurationMs, type LogRow, type MetricConsole, type TraceRow } from './explore-contract';
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
import { LogResult } from './LogResult';
import { MetricResult } from './MetricResult';

type SignalData = PageResult<TraceRow | LogRow> | MetricConsole;

const signalKeys: ExploreSignal[] = ['metrics', 'logs', 'traces'];

export function ExplorePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialEnd] = useState(() => Date.now());
  const query = useMemo(() => {
    const parsed = parseExploreQuery(searchParams);
    return parsed.end ? parsed : { ...parsed, end: initialEnd };
  }, [initialEnd, searchParams]);
  const result = useQuery({
    queryKey: ['explore', query],
    queryFn: ({ signal }) => apiMessageGet<SignalData>(buildSignalApiPath(query), { signal }),
    staleTime: 5_000,
    enabled: !isLiveLogQuery(query)
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
      query: readFormValue(event.currentTarget, 'query'),
      traceId: readFormValue(event.currentTarget, 'traceId'),
      spanId: readFormValue(event.currentTarget, 'spanId'),
      resourceFilter: readFormValue(event.currentTarget, 'resourceFilter'),
      attributeFilter: readFormValue(event.currentTarget, 'attributeFilter'),
      end: Date.now(),
      pageIndex: undefined
    });
  };

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <Typography.Title level={2}>{t('explore.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('explore.description')}</Typography.Text>
      </header>

      <ExploreContext query={query} t={t} />
      <SignalTabs query={query} t={t} updateQuery={updateQuery} />
      <LogMode query={query} t={t} updateQuery={updateQuery} />
      <QueryToolbar query={query} t={t} updateQuery={updateQuery} onSubmit={onSubmit} />
      <ResultPanel result={result} query={query} t={t} navigate={navigate} />
    </div>
  );
}

function ExploreContext({ query, t }: { query: ExploreQuery; t: TFunction }) {
  return <div className={styles.context} aria-label={t('explore.context')}><Space wrap>
    <Tag color="blue">{t(`explore.signals.${query.signal}`)}</Tag>
    {query.serviceName && <Tag>{t('explore.serviceContext', { value: query.serviceName })}</Tag>}
    {query.environment && <Tag>{t('explore.environmentContext', { value: query.environment })}</Tag>}
    <Tag>{t(`explore.timeRanges.${query.timeRange}`)}</Tag>
  </Space></div>;
}

function SignalTabs({ query, t, updateQuery }: { query: ExploreQuery; t: TFunction; updateQuery: (changes: Partial<ExploreQuery>) => void }) {
  return <Space.Compact block>{signalKeys.map(signal => <Button key={signal} type={query.signal === signal ? 'primary' : 'default'} onClick={() => updateQuery({ signal })}>{t(`explore.signals.${signal}`)}</Button>)}</Space.Compact>;
}

function LogMode({ query, t, updateQuery }: { query: ExploreQuery; t: TFunction; updateQuery: (changes: Partial<ExploreQuery>) => void }) {
  if (query.signal !== 'logs') return null;
  return <Space.Compact className={styles.mode}>
    <Button type={query.live ? 'default' : 'primary'} onClick={() => updateQuery({ live: undefined })}>{t('exploreLog.query')}</Button>
    <Button type={query.live ? 'primary' : 'default'} onClick={() => updateQuery({ live: true })}>{t('exploreLog.live')}</Button>
  </Space.Compact>;
}

function QueryToolbar({ query, t, updateQuery, onSubmit }: { query: ExploreQuery; t: TFunction; updateQuery: (changes: Partial<ExploreQuery>) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form className={styles.toolbar} onSubmit={onSubmit}>
    <Select aria-label={t('explore.timeRange')} value={query.timeRange} options={EXPLORE_TIME_RANGES.map(value => ({ value, label: t(`explore.timeRanges.${value}`) }))} onChange={(value: ExploreTimeRange) => updateQuery({ timeRange: value, end: Date.now() })} />
    <Input name="serviceName" defaultValue={query.serviceName} placeholder={t('explore.serviceName')} />
    <Input name="environment" defaultValue={query.environment} placeholder={t('explore.environment')} />
    <Input name="query" defaultValue={query.query} placeholder={t(`explore.queryPlaceholders.${query.signal}`)} />
    <LogFields query={query} t={t} updateQuery={updateQuery} />
    <Button type="primary" htmlType="submit">{t('common.query')}</Button>
  </form>;
}

function LogFields({ query, t, updateQuery }: { query: ExploreQuery; t: TFunction; updateQuery: (changes: Partial<ExploreQuery>) => void }) {
  if (query.signal !== 'logs') return null;
  return <>
    <Select aria-label={t('explore.severity')} allowClear value={query.severityText} placeholder={t('explore.severity')} options={['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].map(value => ({ value, label: value }))} onChange={severityText => updateQuery({ severityText })} />
    <Input name="traceId" defaultValue={query.traceId} placeholder="Trace ID" />
    <Input name="spanId" defaultValue={query.spanId} placeholder="Span ID" />
    <Input name="resourceFilter" defaultValue={query.resourceFilter} placeholder={t('exploreLog.resourceFilter')} />
    <Input name="attributeFilter" defaultValue={query.attributeFilter} placeholder={t('exploreLog.attributeFilter')} />
  </>;
}

function ResultPanel({ result, query, t, navigate }: { result: UseQueryResult<SignalData>; query: ExploreQuery; t: TFunction; navigate: ReturnType<typeof useNavigate> }) {
  if (isLiveLogQuery(query)) return <section className={styles.results} aria-live="polite"><LogResult query={query} t={t} navigate={navigate} /></section>;
  if (result.isPending) return <section className={styles.results} aria-live="polite"><Skeleton active paragraph={{ rows: 8 }} /></section>;
  if (result.isError) return <section className={styles.results} aria-live="polite"><Alert type="error" showIcon title={t('explore.loadFailed')} action={<Button onClick={() => void result.refetch()}>{t('common.retry')}</Button>} /></section>;
  return <section className={styles.results} aria-live="polite">{renderResult(result.data, query, t, navigate)}</section>;
}

function isLiveLogQuery(query: ExploreQuery) {
  return query.signal === 'logs' && Boolean(query.live);
}

function renderResult(data: SignalData, query: ExploreQuery, t: TFunction, navigate: ReturnType<typeof useNavigate>) {
  if (query.signal === 'metrics') return <MetricResult data={data as MetricConsole} t={t} />;
  if (query.signal === 'logs') return <LogResult data={data as PageResult<LogRow>} query={query} t={t} navigate={navigate} />;
  return <TraceResult data={data as PageResult<TraceRow>} query={query} t={t} navigate={navigate} />;
}

function TraceResult({ data, query, t, navigate }: { data: PageResult<TraceRow>; query: ExploreQuery; t: TFunction; navigate: ReturnType<typeof useNavigate> }) {
  const rows = data.content ?? [];
  if (rows.length === 0) return <Empty description={t('explore.empty.traces')} />;
  return <Table rowKey={row => row.traceId ?? row.rootSpanId ?? ''} dataSource={rows} pagination={false} columns={[
    { title: t('explore.trace'), render: (_: unknown, row: TraceRow) => row.traceId ?? '—' },
    { title: t('explore.service'), dataIndex: 'serviceName' },
    { title: t('explore.operation'), dataIndex: 'rootSpanName' },
    { title: t('explore.duration'), render: (_: unknown, row: TraceRow) => traceDurationMs(row) == null ? '—' : `${traceDurationMs(row)} ms` },
    { title: t('explore.relatedLogs'), render: (_: unknown, row: TraceRow) => row.traceId ? <Button className={styles.tableLink ?? ''} type="link" onClick={() => { void navigate(buildCrossSignalPath(query, 'logs', { traceId: row.traceId })); }}>{t('explore.open')}</Button> : '—' }
  ]} />;
}

function readFormValue(form: HTMLFormElement, name: string) {
  const value = new FormData(form).get(name);
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
