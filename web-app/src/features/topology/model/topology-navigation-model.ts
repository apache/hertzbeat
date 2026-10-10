/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { applicationRoutePaths, buildEntityDetailPath } from '@/shared/navigation/app-paths';
import { buildSignalHandoffPath, type ExactTimeWindow } from '@/shared/query-context';

import type { TopologyNode } from './topology-contract';
import {
  entityRelationTopologySource,
  parseTopologyQuery,
  parseTopologySelection,
  writeTopologyQuery,
  writeTopologySelection
} from './topology-model';

export type TopologyFocusPathOptions = {
  entityId: number;
  environment?: string | undefined;
  returnTo?: string | null | undefined;
};

export type TopologyInvestigationPathOptions = {
  entityId: number;
  environment?: string | undefined;
  window: ExactTimeWindow;
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

export function buildTopologyInvestigationPath({ entityId, environment, window }: TopologyInvestigationPathOptions) {
  const query = writeTopologyQuery({
    focusEntityId: entityId,
    depth: 1,
    sourceKind: 'otel',
    window,
    ...(environment ? { environment } : {})
  });
  return `${applicationRoutePaths.topology}?${query.toString()}`;
}

function safeTopologyContext(value?: string | null) {
  if (!value?.startsWith('/')) return undefined;
  const url = new URL(value, 'https://hertzbeat.local');
  if (url.pathname !== applicationRoutePaths.topology) return undefined;
  try {
    const normalized = writeTopologySelection(
      writeTopologyQuery(parseTopologyQuery(url.searchParams)),
      parseTopologySelection(url.searchParams)
    );
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
