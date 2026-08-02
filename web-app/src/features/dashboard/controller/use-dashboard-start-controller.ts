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

export function useDashboardStartController() {
  const roles = useSession().session?.roles ?? [];
  const navigate = useNavigate();
  const createMonitorTarget = buildMonitorCreatePath({ returnTo: applicationRoutePaths.dashboard });
  const telemetryTarget = applicationRoutePaths.instrumentation;
  return {
    canCreateMonitor: monitorCapabilities(roles).canWrite,
    createMonitorTarget,
    monitorListTarget: monitorRoutePaths.list,
    telemetryTarget,
    openCreateMonitor: () => void navigate(createMonitorTarget),
    openMonitors: () => void navigate(monitorRoutePaths.list),
    openTelemetry: () => void navigate(telemetryTarget)
  };
}
