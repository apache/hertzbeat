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

import { readInteger, readBoolean, setInteger, setText, hasControlCharacter } from './agent-context-fields';
import type { AgentTopologyRef, AgentTopologySourceTarget } from './agent-workspace-contract';

export const topologyTargetQueryKeys = new Set([
  'source',
  'focusEntityId',
  'nodeId',
  'edgeId',
  'depth',
  'environment',
  'sourceKind',
  'start',
  'end',
  'relationType',
  'hideInternal',
  'pageIndex',
  'pageSize',
  'returnTo'
]);

const sourceKinds = new Set([
  'all',
  'alert-impact',
  'entity-relation',
  'monitor-bind',
  'monitor-ownership',
  'otlp-trace-call',
  'k8s-workload',
  'cmdb-manual-label',
  'database-middleware-connection',
  'template-dependency'
]);
const maximumWindowMs = 7 * 24 * 60 * 60_000;

export function appendTopologyTargetParams(params: URLSearchParams, target: AgentTopologySourceTarget) {
  const topology = target.topology;
  params.set('source', 'topology');
  setInteger(params, 'focusEntityId', topology.rootEntityId);
  setText(params, 'nodeId', topology.nodeId);
  setText(params, 'edgeId', topology.edgeId);
  setInteger(params, 'depth', topology.depth);
  setText(params, 'environment', topology.environment);
  setText(params, 'sourceKind', topology.sourceKind);
  setInteger(params, 'start', topology.start);
  setInteger(params, 'end', topology.end);
  setText(params, 'relationType', topology.relationType);
  params.set('hideInternal', String(topology.hideInternal));
  setInteger(params, 'pageIndex', topology.pageIndex);
  setInteger(params, 'pageSize', topology.pageSize);
}

export function explicitTopologyTarget(params: URLSearchParams): AgentTopologySourceTarget | undefined {
  if (params.get('source') !== 'topology' || !hasOnlyTopologyKeys(params)) return undefined;
  const topology = readRequiredTopology(params);
  const optional = readOptionalTopology(params);
  if (!topology || !optionalTopologyValid(params, optional)) return undefined;
  if (optional.nodeId) topology.nodeId = optional.nodeId;
  if (optional.edgeId) topology.edgeId = optional.edgeId;
  if (optional.environment) topology.environment = optional.environment;
  if (optional.start !== undefined && optional.end !== undefined) {
    topology.start = optional.start;
    topology.end = optional.end;
  }
  if (optional.relationType) topology.relationType = optional.relationType;
  return { topology };
}

function readRequiredTopology(params: URLSearchParams): AgentTopologyRef | undefined {
  const rootEntityId = readInteger(params, 'focusEntityId', 1, Number.MAX_SAFE_INTEGER);
  const depth = readInteger(params, 'depth', 1, 2);
  const sourceKind = readAgentText(params, 'sourceKind', 64)?.toLowerCase();
  const hideInternal = readBoolean(params, 'hideInternal');
  const pageIndex = readInteger(params, 'pageIndex', 0, 10_000);
  const pageSize = readInteger(params, 'pageSize', 1, 100);
  if (rootEntityId === undefined || depth === undefined || sourceKind === undefined) return undefined;
  if (hideInternal === undefined || pageIndex === undefined || pageSize === undefined) return undefined;
  if (!sourceKinds.has(sourceKind)) return undefined;
  return { rootEntityId, depth: depth as 1 | 2, sourceKind, hideInternal, pageIndex, pageSize };
}

function readOptionalTopology(params: URLSearchParams) {
  return {
    nodeId: readAgentText(params, 'nodeId', 512),
    edgeId: readAgentText(params, 'edgeId', 512),
    environment: readAgentText(params, 'environment', 128),
    relationType: readAgentText(params, 'relationType', 128),
    start: readInteger(params, 'start', 1, Number.MAX_SAFE_INTEGER),
    end: readInteger(params, 'end', 1, Number.MAX_SAFE_INTEGER)
  };
}

function optionalTopologyValid(params: URLSearchParams, values: ReturnType<typeof readOptionalTopology>) {
  if (values.nodeId !== undefined && values.edgeId !== undefined) return false;
  if (!topologyWindowValid(values.start, values.end)) return false;
  return [
    ['nodeId', values.nodeId],
    ['edgeId', values.edgeId],
    ['environment', values.environment],
    ['relationType', values.relationType],
    ['start', values.start],
    ['end', values.end]
  ].every(([key, value]) => params.has(String(key)) === (value !== undefined));
}

function topologyWindowValid(start: number | undefined, end: number | undefined) {
  if ((start === undefined) !== (end === undefined)) return false;
  return start === undefined || end === undefined || (start < end && end - start <= maximumWindowMs);
}

function hasOnlyTopologyKeys(params: URLSearchParams) {
  return [...params.keys()].every(key => topologyTargetQueryKeys.has(key) && params.getAll(key).length === 1);
}

function readAgentText(params: URLSearchParams, key: string, maximum: number) {
  const value = params.get(key);
  const normalized = value?.trim();
  if (!normalized || normalized !== value || normalized.length > maximum || hasControlCharacter(normalized)) {
    return undefined;
  }
  return normalized;
}
