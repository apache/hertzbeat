import React from 'react';
import { redirect } from 'next/navigation';

import MonitorManagePage from './monitor-manage-page';
import { readMonitorManageRouteState, type MonitorManageSearchParams } from '../../lib/monitor-manage/query-state';

export default async function MonitorsRoutePage({
  searchParams
}: {
  searchParams?: Promise<MonitorManageSearchParams>;
} = {}) {
  const resolvedSearchParams = await searchParams;
  const routeState = readMonitorManageRouteState(resolvedSearchParams);

  if (routeState.shouldRedirect) {
    redirect(routeState.canonicalRoute);
  }

  return <MonitorManagePage initialQuery={routeState.query} explicitStatus={routeState.explicitStatus} />;
}
