/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import { TopologyContractError } from '../model/topology-model';

const positiveIdSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const nullableIdSchema = positiveIdSchema.nullable();
const nonblankSchema = z
  .string()
  .min(1)
  .refine(value => value.trim().length > 0);
const nullableTextSchema = nonblankSchema.nullable();
const nullableMetricSchema = z.number().finite().nonnegative().nullable();
const nullableCountSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable();

const redMetricsSchema = z
  .object({
    requestRatePerSecond: nullableMetricSchema,
    requestCount: nullableCountSchema,
    errorRate: nullableMetricSchema,
    errorCount: nullableCountSchema,
    latencyP95Ms: nullableMetricSchema,
    latencyAvgMs: nullableMetricSchema
  })
  .strict();

const nodeSchema = z
  .object({
    id: nonblankSchema,
    entityId: positiveIdSchema,
    entityName: nonblankSchema,
    entityType: nonblankSchema,
    namespace: nonblankSchema,
    environment: nonblankSchema,
    health: nonblankSchema,
    focus: z.boolean(),
    evidenceBadges: z.array(nonblankSchema),
    redMetrics: redMetricsSchema
  })
  .strict();

const edgeSchema = z
  .object({
    id: nonblankSchema,
    relationId: nullableIdSchema,
    sourceNodeId: nonblankSchema,
    targetNodeId: nullableTextSchema,
    sourceEntityId: positiveIdSchema,
    targetEntityId: nullableIdSchema,
    targetRef: nullableTextSchema,
    sampleTraceId: nullableTextSchema,
    sampleSpanId: nullableTextSchema,
    firstSeen: nullableTextSchema,
    lastSeen: nullableTextSchema,
    relationType: nonblankSchema,
    relationSource: nonblankSchema,
    status: nonblankSchema,
    score: z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER).nullable(),
    evidenceBadges: z.array(nonblankSchema),
    redMetrics: redMetricsSchema
  })
  .strict();

const timelineEventSchema = z
  .object({
    id: nonblankSchema,
    edgeId: nullableTextSchema,
    entityId: nullableIdSchema,
    sourceKind: nonblankSchema,
    eventType: nonblankSchema,
    title: nonblankSchema,
    detail: nonblankSchema,
    actor: nonblankSchema,
    occurredAt: nonblankSchema
  })
  .strict();

const topologyGraphSchema = z
  .object({
    apiBacked: z.literal(true),
    focusEntityId: nullableIdSchema,
    depth: z.number().int().min(1).max(2),
    sourceKinds: z.array(nonblankSchema),
    nodes: z.array(nodeSchema),
    edges: z.array(edgeSchema),
    impactTimeline: z.array(timelineEventSchema)
  })
  .strict()
  .superRefine(requireGraphInvariants);

export type TopologyGraph = z.infer<typeof topologyGraphSchema>;
export type TopologyNode = z.infer<typeof nodeSchema>;
export type TopologyEdge = z.infer<typeof edgeSchema>;
export type TopologyTimelineEvent = z.infer<typeof timelineEventSchema>;
export type TopologyRedMetrics = z.infer<typeof redMetricsSchema>;

export function parseTopologyGraph(value: unknown): TopologyGraph {
  const result = topologyGraphSchema.safeParse(value);
  if (!result.success) throw new TopologyContractError();
  return result.data;
}

function requireGraphInvariants(
  graph: { nodes: z.infer<typeof nodeSchema>[]; edges: z.infer<typeof edgeSchema>[] },
  context: z.RefinementCtx
) {
  const nodeIds = new Set<string>();
  graph.nodes.forEach((node, index) => {
    if (nodeIds.has(node.id)) {
      context.addIssue({ code: 'custom', path: ['nodes', index, 'id'], message: 'Topology node IDs must be unique' });
    }
    nodeIds.add(node.id);
  });
  const edgeIds = new Set<string>();
  graph.edges.forEach((edge, index) => {
    if (edgeIds.has(edge.id)) {
      context.addIssue({ code: 'custom', path: ['edges', index, 'id'], message: 'Topology edge IDs must be unique' });
    }
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.sourceNodeId)) {
      context.addIssue({ code: 'custom', path: ['edges', index, 'sourceNodeId'], message: 'Source node is missing' });
    }
    if (edge.targetNodeId !== null && !nodeIds.has(edge.targetNodeId)) {
      context.addIssue({ code: 'custom', path: ['edges', index, 'targetNodeId'], message: 'Target node is missing' });
    }
  });
}
