import React from 'react';

import AlertNoticePage from './alert-notice-page';
import { readAlertNoticeRouteState, type AlertNoticeSearchParams } from '../../../lib/alert-notice/query-state';

export default async function AlertNoticeRoutePage({
  searchParams
}: {
  searchParams?: Promise<AlertNoticeSearchParams>;
} = {}) {
  const resolvedSearchParams = await searchParams;
  const routeState = readAlertNoticeRouteState(resolvedSearchParams);
  return <AlertNoticePage initialRouteState={routeState} />;
}
