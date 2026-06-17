import React from 'react';

import AlertGroupPage from './alert-group-page';
import { readAlertGroupRouteState, type AlertGroupSearchParams } from '../../../lib/alert-group/query-state';

export default async function AlertGroupRoutePage({
  searchParams
}: {
  searchParams?: Promise<AlertGroupSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const routeState = readAlertGroupRouteState(resolvedSearchParams);
  return <AlertGroupPage initialRouteState={routeState} />;
}
