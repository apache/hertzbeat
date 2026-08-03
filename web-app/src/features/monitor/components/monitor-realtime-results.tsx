/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { StarFilled, StarOutlined } from '@ant-design/icons';
import { Button, Table, Tag } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

import type { MonitorMetricWorkbenchController, monitorRealtimeRows } from '../model/monitor-detail-model';
import styles from './monitor-metric-workbench.module.css';
import { useActivateWhenVisible } from './use-activate-when-visible';

export function MonitorRealtimeResult({ state, actions }: Pick<MonitorMetricWorkbenchController, 'state' | 'actions'>) {
  if (state.realtimeGroups.length > 0) return <RealtimeGroupGrid state={state} actions={actions} />;
  return <RealtimeEvidence evidence={state.realtime} />;
}

export function SelectedRealtimeResult({ state }: Pick<MonitorMetricWorkbenchController, 'state'>) {
  return <RealtimeEvidence evidence={state.realtime} />;
}

function RealtimeGroupGrid({ state, actions }: Pick<MonitorMetricWorkbenchController, 'state' | 'actions'>) {
  const { t } = useTranslation();
  const loadMoreRef = useActivateWhenVisible<HTMLButtonElement>(
    state.hasMoreRealtimeGroups,
    actions.loadMoreRealtimeGroups
  );
  return (
    <div className={styles.realtimeGrid}>
      {state.realtimeGroups.map(group => (
        <article key={group.group} className={styles.realtimeGroup}>
          <header className={styles.realtimeGroupHeader}>
            <h5>{group.group}</h5>
            <RealtimeFavoriteButton group={group} onToggle={actions.toggleRealtimeFavorite} />
          </header>
          <RealtimeEvidence evidence={group.result} />
        </article>
      ))}
      {state.hasMoreRealtimeGroups ? (
        <Button ref={loadMoreRef} className={styles.loadMore!} onClick={actions.loadMoreRealtimeGroups}>
          {t('monitorMetrics.loadMore')}
        </Button>
      ) : null}
    </div>
  );
}

function RealtimeFavoriteButton({
  group,
  onToggle
}: {
  group: MonitorMetricWorkbenchController['state']['realtimeGroups'][number];
  onToggle: MonitorMetricWorkbenchController['actions']['toggleRealtimeFavorite'];
}) {
  const { t } = useTranslation();
  const favorited = group.favorite.kind === 'ready' && group.favorite.value;
  return (
    <Button
      type="text"
      size="small"
      icon={favorited ? <StarFilled /> : <StarOutlined />}
      aria-label={t(favorited ? 'monitorMetrics.unfavorite' : 'monitorMetrics.favorite')}
      disabled={group.favorite.kind !== 'ready' || group.favoriteBusy}
      loading={group.favoriteBusy}
      onClick={() => void onToggle(group.group)}
      data-realtime-favorite-group={group.group}
    />
  );
}

function RealtimeEvidence({ evidence }: { evidence: MonitorMetricWorkbenchController['state']['realtime'] }) {
  const { t } = useTranslation();
  if (evidence.kind === 'unavailable') {
    return <OperationalStatePanel kind="unavailable" title={t('common.unavailable')} />;
  }
  if (evidence.kind === 'error') {
    return <OperationalStatePanel kind="error" title={t('common.routeError.description')} />;
  }
  if (evidence.kind === 'empty') {
    return <OperationalStatePanel kind="empty" title={t('monitorMetrics.empty')} />;
  }
  return <RealtimeTable rows={evidence.rows} pending={evidence.kind === 'loading'} />;
}

function RealtimeTable({ rows, pending }: { rows: ReturnType<typeof monitorRealtimeRows>; pending: boolean }) {
  const { t } = useTranslation();
  const columns = [
    {
      title: t('monitorMetrics.labels'),
      dataIndex: 'labels',
      render: (labels: Record<string, string>) => (
        <div className={styles.labels}>
          {Object.entries(labels).map(([key, value]) => (
            <Tag key={key}>
              {key}={value}
            </Tag>
          ))}
        </div>
      )
    },
    { title: t('monitorMetrics.field'), dataIndex: 'field' },
    { title: t('monitorMetrics.unit'), dataIndex: 'unit', render: (value: string | null) => value ?? '—' },
    { title: t('monitorMetrics.time'), dataIndex: 'time', render: formatMetricTime },
    { title: t('monitorMetrics.value'), dataIndex: 'value' }
  ];
  return <Table rowKey="key" size="small" loading={pending} dataSource={rows} columns={columns} pagination={false} />;
}

function formatMetricTime(value?: number | null) {
  return value == null
    ? '—'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(value);
}
