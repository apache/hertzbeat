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

import { formatAgentScopeWindow } from './agent-workspace-format';

import type { TFunction } from 'i18next';

import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';

type TopologyTarget = Extract<NonNullable<AgentWorkspaceViewModel['target']>, { topology: unknown }>;
type TraceTarget = Extract<NonNullable<AgentWorkspaceViewModel['target']>, { trace: unknown }>;
type MonitorTarget = Extract<NonNullable<AgentWorkspaceViewModel['target']>, { monitorId: number }>;
type InvestigationTarget = Exclude<
  Extract<NonNullable<AgentWorkspaceViewModel['target']>, { signal: unknown }>,
  MonitorTarget
>;
type LogTarget = Extract<NonNullable<AgentWorkspaceViewModel['target']>, { log: unknown }>;

export function agentWorkspaceTargetFacts(target: AgentWorkspaceViewModel['target'], t: TFunction) {
  if (!target) return [];
  if ('incident' in target)
    return [
      t('aiWorkspace.evidence.incidentScope', { id: target.incident.analysisPolicyId }),
      ...target.incident.alertIds.map(id => t('aiWorkspace.context.singleAlertTarget', { id })),
      formatAgentScopeWindow(target.incident.windowStartedAt, target.incident.end)
    ];
  if ('signal' in target && !('monitorId' in target)) return investigationTargetFacts(target, t);
  if ('alertId' in target) {
    return [
      t('aiWorkspace.context.singleAlertTarget', { id: target.alertId }),
      ...('version' in target ? [target.version] : [])
    ];
  }
  if ('topology' in target) {
    return topologyTargetFacts(target, t);
  }
  if ('trace' in target) {
    return traceTargetFacts(target, t);
  }
  if ('log' in target) {
    return logTargetFacts(target, t);
  }
  if (!('monitorId' in target)) {
    return [
      t('aiWorkspace.context.entityTarget', { id: target.entityId }),
      ...('version' in target ? [target.version] : [])
    ];
  }
  return monitorTargetFacts(target, t);
}

function investigationTargetFacts(target: InvestigationTarget, t: TFunction) {
  return [
    t('aiWorkspace.evidence.investigationScope'),
    t('aiWorkspace.context.entityTarget', { id: target.entityId }),
    formatAgentScopeWindow(target.signal.start, target.signal.end, target.signal.timezone),
    ...('service' in target && target.service
      ? [target.service.name, target.service.namespace, target.service.environment].filter((value): value is string =>
          Boolean(value)
        )
      : [])
  ];
}

function monitorTargetFacts(target: MonitorTarget, t: TFunction) {
  const facts = [
    t('aiWorkspace.context.monitorTarget', { id: target.monitorId }),
    target.signal.query,
    formatAgentScopeWindow(target.signal.start, target.signal.end, target.signal.timezone)
  ];
  if ('entityId' in target) {
    facts.splice(
      1,
      0,
      t('aiWorkspace.context.entityTarget', { id: target.entityId }),
      target.service.name,
      target.version
    );
    if (target.service.namespace) facts.push(target.service.namespace);
    if (target.service.environment) facts.push(target.service.environment);
  }
  return facts;
}

function logTargetFacts(target: LogTarget, t: TFunction) {
  const log = target.log;
  const facts = [t('aiWorkspace.context.logTarget'), formatAgentScopeWindow(log.start, log.end)];
  if (log.traceId) facts.push(log.traceId);
  if (log.spanId) facts.push(log.spanId);
  if (log.severityNumber !== undefined) facts.push(String(log.severityNumber));
  facts.push(
    ...[
      log.severityText,
      log.search,
      log.serviceName,
      log.serviceNamespace,
      log.environment,
      log.resourceFilter,
      log.attributeFilter
    ].filter((value): value is string => Boolean(value))
  );
  facts.push(t('aiWorkspace.context.pageScope', { page: log.pageIndex + 1, size: log.pageSize }));
  if (log.hideInternal) facts.push(t('aiWorkspace.context.internalHidden'));
  if (log.hideNoise) facts.push(t('aiWorkspace.context.noiseHidden'));
  if ('version' in target) facts.push(target.version);
  return facts;
}

function traceTargetFacts(target: TraceTarget, t: TFunction) {
  const trace = target.trace;
  const facts = [
    t('aiWorkspace.context.traceTarget', { id: trace.traceId }),
    formatAgentScopeWindow(trace.start, trace.end)
  ];
  if (trace.spanId) facts.push(trace.spanId);
  if (trace.serviceName) facts.push(trace.serviceName);
  if (trace.serviceNamespace) facts.push(trace.serviceNamespace);
  if (trace.environment) facts.push(trace.environment);
  if (trace.resourceFilter) facts.push(trace.resourceFilter);
  if (trace.attributeFilter) facts.push(trace.attributeFilter);
  if ('version' in target) facts.push(target.version);
  return facts;
}

function topologyTargetFacts(target: TopologyTarget, t: TFunction) {
  const topology = target.topology;
  const facts = [t('aiWorkspace.context.topologyTarget', { id: topology.rootEntityId })];
  if (topology.start !== undefined && topology.end !== undefined)
    facts.push(formatAgentScopeWindow(topology.start, topology.end));
  if (topology.environment) facts.push(topology.environment);
  if (topology.nodeId) facts.push(topology.nodeId);
  if (topology.edgeId) facts.push(topology.edgeId);
  facts.push(topology.sourceKind);
  if (topology.relationType) facts.push(topology.relationType);
  if ('version' in target) facts.push(target.version);
  return facts;
}
