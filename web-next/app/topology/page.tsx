import React from 'react';
import TopologyRouteClient from './topology-route-client';
import TopologyRouteShell from './topology-route-shell';
import { readTopologyRouteContext, type TopologySearchParams } from '../../lib/topology-surface/query-state';

export default async function TopologyRoutePage({
  searchParams
}: {
  searchParams?: Promise<TopologySearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const routeContext = readTopologyRouteContext(resolvedSearchParams);
  return (
    <>
      <div id="topology-route-deferred-shell">
        <TopologyRouteShell />
      </div>
      <TopologyRouteClient routeContext={routeContext} shellElementId="topology-route-deferred-shell" />
    </>
  );
}
