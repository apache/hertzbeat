import React from 'react';
import LogManagePage from '../manage/log-manage-page';
import { readLogManageRouteState, type LogManageSearchParams } from '@/lib/log-manage/query-state';

export default async function LogStreamPage({
  searchParams
}: {
  searchParams?: Promise<LogManageSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const routeState = readLogManageRouteState(resolvedSearchParams);

  return (
    <div data-log-stream-canonical-live-route="log-manage-stream">
      <LogManagePage initialRouteState={routeState} forcedView="stream" showViewToggle={false} />
    </div>
  );
}
