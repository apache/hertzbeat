/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { buildEntityDetailPath } from '@/shared/navigation/app-paths';
import { buildSignalHandoffPath, type ExactTimeWindow } from '@/shared/query-context';

import type { TopologyNode } from './topology-contract';

export function buildTopologyEntityPath(entityId: number) {
  return buildEntityDetailPath(entityId);
}

export function buildTopologySignalPath(node: TopologyNode, window: ExactTimeWindow | undefined) {
  if (!window || node.entityType !== 'service') return undefined;
  return buildSignalHandoffPath(
    'metrics',
    {
      serviceName: node.entityName,
      ...(node.namespace ? { serviceNamespace: node.namespace } : {}),
      ...(node.environment ? { environment: node.environment } : {})
    },
    window
  );
}
