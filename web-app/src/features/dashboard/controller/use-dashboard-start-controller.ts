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

import { useNavigate } from 'react-router-dom';

import { useSession } from '@/core/auth/session-context';
import { buildExplorePath } from '@/features/explore';
import { monitorCapabilities } from '@/features/monitor';
import { applicationRoutePaths, buildMonitorCreatePath, monitorRoutePaths } from '@/shared/navigation/app-paths';

import { useDashboardMetricRotation } from './use-dashboard-metric-rotation';
import { useDashboardOverview } from './use-dashboard-overview';
import { useDashboardSignals } from './use-dashboard-signals';

export function useDashboardStartController() {
  const roles = useSession().session?.roles ?? [];
  const navigate = useNavigate();
  const overview = useDashboardOverview();
  const signals = useDashboardSignals(overview.favoriteMetrics, overview.savedState);
  const attentionCount = Math.ceil((overview.alerts.length + overview.downMonitors.length) / 2);
  const attention = useDashboardMetricRotation(attentionCount, signals.clock.hidden, signals.clock.reducedMotion);
  const createMonitorTarget = buildMonitorCreatePath({ returnTo: applicationRoutePaths.dashboard });
  const telemetryTarget = applicationRoutePaths.instrumentation;
  return {
    overview,
    signals,
    attentionRotation: { ...attention, activeIndex: attention.metricIndex, metricCount: attentionCount },
    signalTargets: {
      metrics: buildExplorePath({ signal: 'metrics', timeRange: 'last-15m' }),
      logs: buildExplorePath({ signal: 'logs', timeRange: 'last-15m', searchSyntax: 'structured-v1' }),
      traces: buildExplorePath({ signal: 'traces', timeRange: 'last-15m' })
    },
    canCreateMonitor: monitorCapabilities(roles).canWrite,
    createMonitorTarget,
    monitorListTarget: monitorRoutePaths.list,
    telemetryTarget,
    savedQueriesTarget: `${applicationRoutePaths.explore}?signal=metrics&timeRange=last-15m#saved-queries`,
    openCreateMonitor: () => void navigate(createMonitorTarget),
    openMonitors: () => void navigate(monitorRoutePaths.list),
    openTelemetry: () => void navigate(telemetryTarget)
  };
}
