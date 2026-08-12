/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

import type { MonitorMetricWorkbenchController, monitorRealtimeRows } from '../model/monitor-detail-model';
import { MonitorRealtimeTable } from './monitor-realtime-table';

export function RealtimeEvidence({
  evidence,
  ...tableProps
}: {
  evidence: MonitorMetricWorkbenchController['state']['realtime'];
  group?: string | undefined;
  metricOptions?: MonitorMetricWorkbenchController['state']['catalog']['options'] | undefined;
  selectedMetricKey?: string | undefined;
  onSelectMetric?: ((metricKey: string) => void) | undefined;
}) {
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
  return <RealtimeTable rows={evidence.rows} pending={evidence.kind === 'loading'} {...tableProps} />;
}

function RealtimeTable({
  rows,
  pending,
  ...props
}: { rows: ReturnType<typeof monitorRealtimeRows>; pending: boolean } & Omit<
  Parameters<typeof MonitorRealtimeTable>[0],
  'rows' | 'pending'
>) {
  return <MonitorRealtimeTable rows={rows} pending={pending} {...props} />;
}
