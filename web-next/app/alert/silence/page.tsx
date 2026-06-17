import React from 'react';

import AlertSilencePage from './alert-silence-page';
import { readAlertSilenceRouteState, type AlertSilenceSearchParams } from '../../../lib/alert-silence/query-state';

export default async function AlertSilenceRoutePage({
  searchParams
}: {
  searchParams?: Promise<AlertSilenceSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const routeState = readAlertSilenceRouteState(resolvedSearchParams);
  return <AlertSilencePage initialRouteState={routeState} />;
}
