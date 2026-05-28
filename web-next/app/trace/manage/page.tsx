import React from 'react';
import TraceManagePage from './trace-manage-page';
import { readTraceManageRouteState, type TraceManageSearchParams } from '@/lib/trace-manage/query-state';

export default async function TraceManageRoutePage({
  searchParams
}: {
  searchParams?: Promise<TraceManageSearchParams>;
} = {}) {
  const resolvedSearchParams = await searchParams;
  const routeState = readTraceManageRouteState(resolvedSearchParams);
  return <TraceManagePage initialRouteState={routeState} />;
}
