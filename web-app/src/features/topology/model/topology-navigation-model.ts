/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { applicationRoutePaths, buildEntityDetailPath } from '@/shared/navigation/app-paths';
import { buildSignalHandoffPath, type ExactTimeWindow } from '@/shared/query-context';

import type { TopologyNode } from './topology-contract';
import { entityRelationTopologySource, parseTopologyQuery, writeTopologyQuery } from './topology-model';

export type TopologyFocusPathOptions = {
  entityId: number;
  environment?: string | undefined;
  returnTo?: string | null | undefined;
};

export function buildTopologyEntityPath(entityId: number, returnTo: string) {
  return buildEntityDetailPath(entityId, safeTopologyReturnTo(returnTo));
}

export function safeTopologyReturnTo(value?: string | null) {
  return safeTopologyContext(value) ?? applicationRoutePaths.topology;
}

export function buildTopologyFocusPath({ entityId, environment, returnTo }: TopologyFocusPathOptions) {
  const retained = safeTopologyContext(returnTo);
  if (retained) return retained;
  const query = writeTopologyQuery({
    focusEntityId: entityId,
    depth: 2,
    ...(environment ? { environment } : {}),
    sourceKind: entityRelationTopologySource
  });
  return `${applicationRoutePaths.topology}?${query.toString()}`;
}

function safeTopologyContext(value?: string | null) {
  if (!value?.startsWith('/')) return undefined;
  const url = new URL(value, 'https://hertzbeat.local');
  if (url.pathname !== applicationRoutePaths.topology) return undefined;
  try {
    const normalized = writeTopologyQuery(parseTopologyQuery(url.searchParams));
    const safe = new URLSearchParams();
    normalized.forEach((fieldValue, field) => {
      if (url.searchParams.has(field)) safe.set(field, fieldValue);
    });
    const search = safe.toString();
    return search ? `${applicationRoutePaths.topology}?${search}` : undefined;
  } catch {
    return undefined;
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
