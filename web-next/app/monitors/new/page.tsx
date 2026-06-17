import React from 'react';
import { redirect } from 'next/navigation';

import MonitorNewPage from './monitor-new-page';
import {
  buildMonitorNewDefaultAppRedirectUrl,
  hasMonitorNewAppParam,
  readMonitorNewRouteState,
  type MonitorNewSearchParams
} from '../../../lib/monitor-editor/query-state';

export default async function MonitorNewRoutePage({
  searchParams
}: {
  searchParams?: Promise<MonitorNewSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  if (!hasMonitorNewAppParam(resolvedSearchParams)) {
    redirect(buildMonitorNewDefaultAppRedirectUrl());
  }
  const routeState = readMonitorNewRouteState(resolvedSearchParams);
  return <MonitorNewPage initialRouteState={routeState} />;
}
