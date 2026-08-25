/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { TFunction } from 'i18next';

import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';

type TopologyTarget = Extract<NonNullable<AgentWorkspaceViewModel['target']>, { topology: unknown }>;
type TraceTarget = Extract<NonNullable<AgentWorkspaceViewModel['target']>, { trace: unknown }>;
type LogTarget = Extract<NonNullable<AgentWorkspaceViewModel['target']>, { log: unknown }>;

export function agentWorkspaceTargetFacts(target: AgentWorkspaceViewModel['target'], t: TFunction) {
  if (!target) return [];
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
  const facts = [
    t('aiWorkspace.context.monitorTarget', { id: target.monitorId }),
    target.signal.query,
    target.signal.timezone
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
  const facts = [t('aiWorkspace.context.logTarget'), `${log.start}–${log.end}`];
  if (log.traceId) facts.push(log.traceId);
  if (log.spanId) facts.push(log.spanId);
  if (log.severityNumber !== undefined) facts.push(String(log.severityNumber));
  if (log.severityText) facts.push(log.severityText);
  if (log.search) facts.push(log.search);
  if (log.serviceName) facts.push(log.serviceName);
  if (log.serviceNamespace) facts.push(log.serviceNamespace);
  if (log.environment) facts.push(log.environment);
  if (log.resourceFilter) facts.push(log.resourceFilter);
  if (log.attributeFilter) facts.push(log.attributeFilter);
  facts.push(`pageIndex=${log.pageIndex}`, `pageSize=${log.pageSize}`);
  if ('version' in target) facts.push(target.version);
  return facts;
}

function traceTargetFacts(target: TraceTarget, t: TFunction) {
  const trace = target.trace;
  const facts = [t('aiWorkspace.context.traceTarget', { id: trace.traceId })];
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
  if (topology.nodeId) facts.push(topology.nodeId);
  if (topology.edgeId) facts.push(topology.edgeId);
  facts.push(topology.sourceKind);
  if (topology.relationType) facts.push(topology.relationType);
  if ('version' in target) facts.push(target.version);
  return facts;
}
