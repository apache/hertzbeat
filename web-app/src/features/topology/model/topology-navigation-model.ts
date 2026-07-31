/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { applicationRoutePaths, buildEntityDetailPath } from '@/shared/navigation/app-paths';
import { buildSignalHandoffPath, type ExactTimeWindow } from '@/shared/query-context';

import type { TopologyNode } from './topology-contract';
import { parseTopologyQuery, writeTopologyQuery } from './topology-model';

export function buildTopologyEntityPath(entityId: number, returnTo: string) {
  return buildEntityDetailPath(entityId, safeTopologyReturnTo(returnTo));
}

export function safeTopologyReturnTo(value?: string | null) {
  if (!value?.startsWith('/')) return applicationRoutePaths.topology;
  const url = new URL(value, 'https://hertzbeat.local');
  if (url.pathname !== applicationRoutePaths.topology) return applicationRoutePaths.topology;
  try {
    const normalized = writeTopologyQuery(parseTopologyQuery(url.searchParams));
    const safe = new URLSearchParams();
    normalized.forEach((fieldValue, field) => {
      if (url.searchParams.has(field)) safe.set(field, fieldValue);
    });
    const search = safe.toString();
    return search ? `${applicationRoutePaths.topology}?${search}` : applicationRoutePaths.topology;
  } catch {
    return applicationRoutePaths.topology;
  }
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
