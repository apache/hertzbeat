/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { AgentChatRequest } from '../model/agent-workspace-contract';

type SourceTarget = NonNullable<AgentChatRequest['target']>;

export function projectAgentSourceTarget(target: SourceTarget) {
  if ('topology' in target) return topologyTarget(target);
  if ('trace' in target) return traceTarget(target);
  if ('log' in target) return logTarget(target);
  if ('alertId' in target) return { alertId: target.alertId, alertType: target.alertType };
  if ('signal' in target)
    return {
      monitorId: target.monitorId,
      signal: {
        type: target.signal.type,
        query: target.signal.query,
        start: target.signal.start,
        end: target.signal.end,
        timezone: target.signal.timezone
      }
    };
  return { entityId: target.entityId };
}

function topologyTarget(target: Extract<SourceTarget, { topology: unknown }>) {
  const topology = target.topology;
  return {
    topology: {
      rootEntityId: topology.rootEntityId,
      ...(topology.nodeId ? { nodeId: topology.nodeId } : {}),
      ...(topology.edgeId ? { edgeId: topology.edgeId } : {}),
      depth: topology.depth,
      ...(topology.environment ? { environment: topology.environment } : {}),
      sourceKind: topology.sourceKind,
      ...(topology.start !== undefined && topology.end !== undefined
        ? { start: topology.start, end: topology.end }
        : {}),
      ...(topology.relationType ? { relationType: topology.relationType } : {}),
      hideInternal: topology.hideInternal,
      pageIndex: topology.pageIndex,
      pageSize: topology.pageSize
    }
  };
}

function traceTarget(target: Extract<SourceTarget, { trace: unknown }>) {
  const trace = target.trace;
  return {
    trace: {
      traceId: trace.traceId,
      ...(trace.spanId ? { spanId: trace.spanId } : {}),
      start: trace.start,
      end: trace.end,
      ...(trace.serviceName ? { serviceName: trace.serviceName } : {}),
      ...(trace.serviceNamespace ? { serviceNamespace: trace.serviceNamespace } : {}),
      ...(trace.environment ? { environment: trace.environment } : {}),
      ...(trace.resourceFilter ? { resourceFilter: trace.resourceFilter } : {}),
      ...(trace.attributeFilter ? { attributeFilter: trace.attributeFilter } : {}),
      ...(trace.minDurationMs !== undefined ? { minDurationMs: trace.minDurationMs } : {}),
      ...(trace.maxDurationMs !== undefined ? { maxDurationMs: trace.maxDurationMs } : {})
    }
  };
}

function logTarget(target: Extract<SourceTarget, { log: unknown }>) {
  const log = target.log;
  return {
    log: {
      start: log.start,
      end: log.end,
      ...(log.traceId ? { traceId: log.traceId } : {}),
      ...(log.spanId ? { spanId: log.spanId } : {}),
      ...(log.severityNumber !== undefined ? { severityNumber: log.severityNumber } : {}),
      ...(log.severityText ? { severityText: log.severityText } : {}),
      ...(log.search ? { search: log.search } : {}),
      ...(log.serviceName ? { serviceName: log.serviceName } : {}),
      ...(log.serviceNamespace ? { serviceNamespace: log.serviceNamespace } : {}),
      ...(log.environment ? { environment: log.environment } : {}),
      ...(log.resourceFilter ? { resourceFilter: log.resourceFilter } : {}),
      ...(log.attributeFilter ? { attributeFilter: log.attributeFilter } : {}),
      hideInternal: log.hideInternal,
      hideNoise: log.hideNoise,
      pageIndex: log.pageIndex,
      pageSize: log.pageSize
    }
  };
}
