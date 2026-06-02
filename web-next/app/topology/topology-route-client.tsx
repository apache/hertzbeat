'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { preloadHzTopologyG6Runtime } from '@hertzbeat/ui/topology-g6-runtime';
import TopologyRouteShell from './topology-route-shell';
import { preloadTopologyGraph, resolveTopologyApiTimeoutMs } from '../../lib/topology-surface/controller';
import type { TopologyRouteContext } from '../../lib/topology-surface/view-model';

void preloadHzTopologyG6Runtime();

const TopologyPage = dynamic(() => import('./topology-page'), {
  ssr: false,
  loading: () => <TopologyRouteShell />
});

export default function TopologyRouteClient({
  routeContext,
  shellElementId
}: {
  routeContext?: TopologyRouteContext;
  shellElementId?: string;
}) {
  const routeContextKey = React.useMemo(() => JSON.stringify(routeContext ?? {}), [routeContext]);
  const topologyScaleProof = routeContext?.scaleProof?.trim();

  React.useEffect(() => {
    if (routeContext?.scaleProof?.trim()) return;
    void preloadTopologyGraph(routeContext ?? {}, { timeoutMs: resolveTopologyApiTimeoutMs(routeContext) });
  }, [routeContext, routeContextKey]);

  React.useEffect(() => {
    if (!shellElementId) return;
    document.getElementById(shellElementId)?.setAttribute('hidden', '');
  }, [shellElementId]);

  return (
    <>
      <span hidden data-topology-route-client-prefetch="topology-api-before-heavy-page" />
      {topologyScaleProof ? <span hidden data-topology-route-client-scale-proof-prefetch="skipped" /> : null}
      <TopologyPage routeContext={routeContext} />
    </>
  );
}
