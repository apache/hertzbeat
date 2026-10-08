/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
