import React from 'react';

import AlertCenterPage from './alert-center-page';
import { readAlertCenterRouteState, type AlertCenterSearchParams } from '../../lib/alert-manage/query-state';

export default async function AlertCenterRoutePage({
  searchParams
}: {
  searchParams?: Promise<AlertCenterSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const routeState = readAlertCenterRouteState(resolvedSearchParams);
  return <AlertCenterPage initialRouteState={routeState} />;
}
