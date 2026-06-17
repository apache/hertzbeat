import React from 'react';

import AlertInhibitPage from './alert-inhibit-page';
import { readAlertInhibitRouteState, type AlertInhibitSearchParams } from '../../../lib/alert-inhibit/query-state';

export default async function AlertInhibitRoutePage({
  searchParams
}: {
  searchParams?: Promise<AlertInhibitSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const routeState = readAlertInhibitRouteState(resolvedSearchParams);
  return <AlertInhibitPage initialRouteState={routeState} />;
}
