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
