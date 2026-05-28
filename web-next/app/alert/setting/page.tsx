import React from 'react';

import AlertSettingPage from './alert-setting-page';
import { readAlertSettingRouteState, type AlertSettingSearchParams } from '../../../lib/alert-setting/query-state';

export default async function AlertSettingRoutePage({
  searchParams
}: {
  searchParams?: Promise<AlertSettingSearchParams>;
} = {}) {
  const resolvedSearchParams = await searchParams;
  const routeState = readAlertSettingRouteState(resolvedSearchParams);
  return <AlertSettingPage initialRouteState={routeState} />;
}
