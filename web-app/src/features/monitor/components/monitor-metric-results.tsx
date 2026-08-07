/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Tabs, Tag } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

import type { MonitorMetricWorkbenchController } from '../model/monitor-detail-model';
import { MonitorHistoryResult, MonitorSelectedHistoryResult } from './monitor-history-results';
import { MonitorRealtimeResult, SelectedRealtimeResult } from './monitor-realtime-results';
import styles from './monitor-metric-workbench.module.css';

export function MonitorMetricResults({ state, actions }: MonitorMetricWorkbenchController) {
  const { t } = useTranslation();
  return (
    <Tabs
      items={[
        {
          key: 'realtime',
          label: t('monitorMetrics.realtime'),
          children: <MonitorRealtimeResult state={state} actions={actions} />
        },
        {
          key: 'history',
          label: t('monitorMetrics.history'),
          children: <MonitorHistoryResult state={state} actions={actions} />
        },
        {
          key: 'favorites',
          label: t('monitorMetrics.favorites'),
          children: <FavoriteCollection state={state} actions={actions} />
        }
      ]}
    />
  );
}

function FavoriteCollection({ state, actions }: MonitorMetricWorkbenchController) {
  const { t } = useTranslation();
  const evidence = state.favoriteCollection;
  if (evidence.kind !== 'ready') return <FavoriteCollectionState kind={evidence.kind} />;
  const selected = evidence.items.some(item => item.available && item.key === state.metricKey);
  return (
    <div className={styles.favoriteCollection}>
      <div className={styles.favoriteList}>
        {evidence.items.map(item => (
          <span key={item.key} className={styles.favoriteItem}>
            <Button
              disabled={!item.available}
              type="default"
              aria-pressed={item.key === state.metricKey}
              className={(item.key === state.metricKey ? styles.favoriteChoiceSelected : styles.favoriteChoice) ?? ''}
              onClick={() => actions.setMetric(item.key)}
            >
              {item.key}
            </Button>
            {!item.available && <Tag>{t('monitorMetrics.favoriteUnavailable')}</Tag>}
          </span>
        ))}
      </div>
      {selected ? (
        <Tabs
          items={[
            {
              key: 'realtime',
              label: t('monitorMetrics.realtime'),
              children: <SelectedRealtimeResult state={state} />
            },
            {
              key: 'history',
              label: t('monitorMetrics.history'),
              children: <MonitorSelectedHistoryResult state={state} actions={actions} />
            }
          ]}
        />
      ) : (
        <OperationalStatePanel kind="empty" title={t('monitorMetrics.favoriteSelect')} />
      )}
    </div>
  );
}

function FavoriteCollectionState({ kind }: { kind: 'loading' | 'empty' | 'unavailable' | 'error' }) {
  const { t } = useTranslation();
  switch (kind) {
    case 'loading':
      return <OperationalStatePanel kind="loading" title={t('monitorMetrics.loading')} />;
    case 'empty':
      return <OperationalStatePanel kind="empty" title={t('monitorMetrics.favoriteEmpty')} />;
    case 'unavailable':
      return <OperationalStatePanel kind="unavailable" title={t('common.unavailable')} />;
    case 'error':
      return <OperationalStatePanel kind="error" title={t('common.routeError.description')} />;
  }
}
