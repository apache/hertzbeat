/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

const maximumWindowMs = 7 * 24 * 60 * 60_000;
const sourceKindSchema = z.enum([
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

export const agentTopologySchema = z
  .object({
    rootEntityId: z.number().int().positive(),
    nodeId: z.string().trim().min(1).max(512).optional(),
    edgeId: z.string().trim().min(1).max(512).optional(),
    depth: z.union([z.literal(1), z.literal(2)]),
    environment: z.string().trim().min(1).max(128).optional(),
    sourceKind: sourceKindSchema,
    start: z.number().int().positive().optional(),
    end: z.number().int().positive().optional(),
    relationType: z.string().trim().min(1).max(128).optional(),
    hideInternal: z.boolean(),
    pageIndex: z.number().int().min(0).max(10_000),
    pageSize: z.number().int().min(1).max(100)
  })
  .strict()
  .refine(topologyValueValid);

const agentTopologyWireSchema = z
  .object({
    rootEntityId: z.number().int().positive(),
    nodeId: z.string().trim().min(1).max(512).nullable().optional(),
    edgeId: z.string().trim().min(1).max(512).nullable().optional(),
    depth: z.union([z.literal(1), z.literal(2)]),
    environment: z.string().trim().min(1).max(128).nullable().optional(),
    sourceKind: sourceKindSchema,
    start: z.number().int().positive().nullable().optional(),
    end: z.number().int().positive().nullable().optional(),
    relationType: z.string().trim().min(1).max(128).nullable().optional(),
    hideInternal: z.boolean(),
    pageIndex: z.number().int().min(0).max(10_000),
    pageSize: z.number().int().min(1).max(100)
  })
  .strict()
  .refine(topologyValueValid)
  .transform(value => ({
    rootEntityId: value.rootEntityId,
    ...(value.nodeId ? { nodeId: value.nodeId } : {}),
    ...(value.edgeId ? { edgeId: value.edgeId } : {}),
    depth: value.depth,
    ...(value.environment ? { environment: value.environment } : {}),
    sourceKind: value.sourceKind,
    ...(value.start != null && value.end != null ? { start: value.start, end: value.end } : {}),
    ...(value.relationType ? { relationType: value.relationType } : {}),
    hideInternal: value.hideInternal,
    pageIndex: value.pageIndex,
    pageSize: value.pageSize
  }));

export const topologySourceTargetWireSchema = z
  .object({
    version: z.null().optional(),
    monitorId: z.null().optional(),
    alertId: z.null().optional(),
    alertType: z.null().optional(),
    entityId: z.null().optional(),
    collector: z.null().optional(),
    signal: z.null().optional(),
    topology: agentTopologyWireSchema,
    trace: z.null().optional(),
    log: z.null().optional(),
    service: z.null().optional(),
    authority: z.null().optional()
  })
  .strict()
  .transform(value => ({ topology: value.topology }));

export function topologyTargetWireSchema(authority: z.ZodType) {
  return z
    .object({
      version: z.literal('topology.v1'),
      monitorId: z.null().optional(),
      alertId: z.null().optional(),
      alertType: z.null().optional(),
      entityId: z.number().int().positive(),
      collector: z.null().optional(),
      signal: z.null().optional(),
      topology: agentTopologyWireSchema,
      trace: z.null().optional(),
      log: z.null().optional(),
      service: z.null().optional(),
      authority
    })
    .strict()
    .refine(value => value.entityId === value.topology.rootEntityId)
    .refine(value => (value.authority as { bindingId?: number }).bindingId === value.entityId)
    .transform(value => ({ version: value.version, entityId: value.entityId, topology: value.topology }));
}

function topologyValueValid(value: {
  nodeId?: string | null | undefined;
  edgeId?: string | null | undefined;
  start?: number | null | undefined;
  end?: number | null | undefined;
}) {
  return (
    !(value.nodeId != null && value.edgeId != null) &&
    (value.start == null) === (value.end == null) &&
    (value.start == null ||
      value.end == null ||
      (value.start < value.end && value.end - value.start <= maximumWindowMs))
  );
}
