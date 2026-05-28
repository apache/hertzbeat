import React from 'react';
import LogManagePage from './log-manage-page';
import { readLogManageRouteState, type LogManageSearchParams } from '@/lib/log-manage/query-state';

export default async function LogManageRoutePage({
  searchParams
}: {
  searchParams?: Promise<LogManageSearchParams>;
} = {}) {
  const resolvedSearchParams = await searchParams;
  const routeState = readLogManageRouteState(resolvedSearchParams);
  return <LogManagePage initialRouteState={routeState} />;
}
