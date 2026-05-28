'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '../api-facade';
import { queryKeys } from '../query-keys';
import type { TopologyRouteContext } from './view-model';

export function useTopologyGraphQuery(routeContext: TopologyRouteContext = {}) {
  return useQuery({
    queryKey: queryKeys.topology.graph(routeContext),
    queryFn: () => api.topology.graph(routeContext)
  });
}
