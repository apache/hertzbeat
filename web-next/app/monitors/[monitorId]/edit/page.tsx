import React from 'react';

import MonitorEditPage from './monitor-edit-page';
import { readMonitorEditRouteState, type MonitorEditSearchParams } from '../../../../lib/monitor-editor/query-state';

export default async function MonitorEditRoutePage({
  params,
  searchParams
}: {
  params: Promise<{ monitorId: string }>;
  searchParams?: Promise<MonitorEditSearchParams>;
}) {
  const { monitorId } = await params;
  const resolvedSearchParams = await searchParams;
  const routeState = readMonitorEditRouteState(resolvedSearchParams);
  return <MonitorEditPage monitorId={monitorId} initialRouteState={routeState} />;
}
