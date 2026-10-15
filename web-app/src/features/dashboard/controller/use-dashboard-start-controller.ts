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
import { monitorCapabilities } from '@/features/monitor';
import { applicationRoutePaths, buildMonitorCreatePath, monitorRoutePaths } from '@/shared/navigation/app-paths';

import { useDashboardActivity } from './use-dashboard-activity';

export function useDashboardStartController() {
  const roles = useSession().session?.roles ?? [];
  const navigate = useNavigate();
  const activity = useDashboardActivity();
  const createMonitorTarget = buildMonitorCreatePath({ returnTo: applicationRoutePaths.dashboard });
  const telemetryTarget = applicationRoutePaths.instrumentation;
  return {
    activity,
    canCreateMonitor: monitorCapabilities(roles).canWrite,
    createMonitorTarget,
    monitorListTarget: monitorRoutePaths.list,
    telemetryTarget,
    savedQueriesTarget: `${applicationRoutePaths.explore}?signal=metrics&timeRange=last-30m#saved-queries`,
    openCreateMonitor: () => void navigate(createMonitorTarget),
    openMonitors: () => void navigate(monitorRoutePaths.list),
    openTelemetry: () => void navigate(telemetryTarget)
  };
}
