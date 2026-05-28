import React from 'react';
import TopologyPage from './topology-page';
import { readTopologyRouteContext, type TopologySearchParams } from '../../lib/topology-surface/query-state';

export default async function TopologyRoutePage({
  searchParams
}: {
  searchParams?: Promise<TopologySearchParams>;
} = {}) {
  const resolvedSearchParams = await searchParams;
  const routeContext = readTopologyRouteContext(resolvedSearchParams);
  return <TopologyPage routeContext={routeContext} />;
}
