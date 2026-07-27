/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import { TopologyContractError } from '../model/topology-model';
import type {
  TopologyEdge,
  TopologyEdgePage,
  TopologyGraph,
  TopologyNode,
  TopologyPartialReason,
  TopologyRedMetrics,
  TopologyTimelineEvent
} from '../model/topology-contract';

const positiveIdSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const nullableIdSchema = positiveIdSchema.nullable();
const nonblankSchema = z
  .string()
  .min(1)
  .refine(value => value.trim().length > 0);
const nullableTextSchema = nonblankSchema.nullable();
const nullableMetricSchema = z.number().finite().nonnegative().nullable();
const nullableCountSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable();
const javaIntegerMax = 2_147_483_647;
const topologyEdgePageSizeMax = 200;
const countSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const javaIntegerSchema = z.number().int().nonnegative().max(javaIntegerMax);
const partialReasonSchema = z.enum(['entity_seed_limit', 'edge_page']);
const edgePageSchema: z.ZodType<TopologyEdgePage> = z
  .object({
    pageIndex: javaIntegerSchema,
    pageSize: javaIntegerSchema.max(topologyEdgePageSizeMax),
    totalElements: countSchema,
    hasNext: z.boolean()
  })
  .strict();

const redMetricsSchema: z.ZodType<TopologyRedMetrics> = z
  .object({
    requestRatePerSecond: nullableMetricSchema,
    requestCount: nullableCountSchema,
    errorRate: nullableMetricSchema,
    errorCount: nullableCountSchema,
    latencyP95Ms: nullableMetricSchema,
    latencyAvgMs: nullableMetricSchema
  })
  .strict();

const nodeSchema: z.ZodType<TopologyNode> = z
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

const edgeSchema: z.ZodType<TopologyEdge> = z
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

const timelineEventSchema: z.ZodType<TopologyTimelineEvent> = z
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

const topologyGraphSchema: z.ZodType<TopologyGraph> = z
  .object({
    apiBacked: z.literal(true),
    focusEntityId: nullableIdSchema,
    depth: z.number().int().min(1).max(2),
    partial: z.boolean(),
    partialReasons: z.array(partialReasonSchema).max(2),
    edgePage: edgePageSchema,
    sourceKinds: z.array(nonblankSchema),
    nodes: z.array(nodeSchema),
    edges: z.array(edgeSchema),
    impactTimeline: z.array(timelineEventSchema)
  })
  .strict()
  .superRefine(requireGraphInvariants);

export function parseTopologyGraph(value: unknown): TopologyGraph {
  const result = topologyGraphSchema.safeParse(value);
  if (!result.success) throw new TopologyContractError();
  return result.data;
}

function requireGraphInvariants(
  graph: {
    partial: boolean;
    partialReasons: TopologyPartialReason[];
    edgePage: TopologyEdgePage;
    nodes: TopologyNode[];
    edges: TopologyEdge[];
  },
  context: z.RefinementCtx
) {
  requireCompletenessInvariants(graph, context);
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

function requireCompletenessInvariants(
  graph: {
    partial: boolean;
    partialReasons: TopologyPartialReason[];
    edgePage: TopologyEdgePage;
    edges: TopologyEdge[];
  },
  context: z.RefinementCtx
) {
  if (!hasStablePartialReasons(graph.partialReasons)) {
    context.addIssue({
      code: 'custom',
      path: ['partialReasons'],
      message: 'Partial reasons must be stable and unique'
    });
  }
  if (!partialFlagMatchesReasons(graph.partial, graph.partialReasons)) {
    context.addIssue({ code: 'custom', path: ['partial'], message: 'Partial state must match its reasons' });
  }

  if (!pageContinuationMatches(graph.edgePage)) {
    context.addIssue({
      code: 'custom',
      path: ['edgePage', 'hasNext'],
      message: 'Edge page continuation is inconsistent'
    });
  }
  if (!unpagedEdgesAreComplete(graph.edgePage, graph.edges.length)) {
    context.addIssue({ code: 'custom', path: ['edgePage'], message: 'Unpaged edge evidence must be complete' });
  }
  if (!edgeTotalCoversPage(graph.edgePage, graph.edges.length)) {
    context.addIssue({ code: 'custom', path: ['edgePage', 'totalElements'], message: 'Edge total is below the page' });
  }
  if (!edgePageLengthMatches(graph.edgePage, graph.edges.length)) {
    context.addIssue({ code: 'custom', path: ['edges'], message: 'Edge page length is inconsistent' });
  }
  if (!edgePageReasonMatches(graph.partialReasons, graph.edgePage)) {
    context.addIssue({
      code: 'custom',
      path: ['partialReasons'],
      message: 'Edge page reason must match page evidence'
    });
  }
}

function hasStablePartialReasons(reasons: TopologyPartialReason[]) {
  const canonicalReasons: TopologyPartialReason[] = ['entity_seed_limit', 'edge_page'];
  const uniqueReasons = [...new Set(reasons)];
  const orderedReasons = canonicalReasons.filter(reason => uniqueReasons.includes(reason));
  return uniqueReasons.length === reasons.length && orderedReasons.every((reason, index) => reasons[index] === reason);
}

function partialFlagMatchesReasons(partial: boolean, reasons: TopologyPartialReason[]) {
  return partial === reasons.length > 0;
}

function pageContinuationMatches(page: TopologyEdgePage) {
  const expectedHasNext = page.pageSize > 0 && (page.pageIndex + 1) * page.pageSize < page.totalElements;
  return page.hasNext === expectedHasNext;
}

function unpagedEdgesAreComplete(page: TopologyEdgePage, edgeCount: number) {
  return page.pageSize !== 0 || page.totalElements === edgeCount;
}

function edgeTotalCoversPage(page: TopologyEdgePage, edgeCount: number) {
  return page.totalElements >= edgeCount;
}

function edgePageLengthMatches(page: TopologyEdgePage, edgeCount: number) {
  const expectedLength = Math.min(page.pageSize, Math.max(page.totalElements - page.pageIndex * page.pageSize, 0));
  return page.pageSize === 0 || edgeCount === expectedLength;
}

function edgePageReasonMatches(reasons: TopologyPartialReason[], page: TopologyEdgePage) {
  const hasPartialPage = page.pageIndex > 0 || page.hasNext;
  return reasons.includes('edge_page') === hasPartialPage;
}
