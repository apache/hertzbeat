/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';
import { ExploreSignalContractError } from './explore-signal-contract';

const shape = z.object({
  serviceName: z.string().nullable(),
  operationName: z.string().nullable(),
  status: z.string().nullable(),
  parentServiceName: z.string().nullable(),
  parentOperationName: z.string().nullable(),
  missingParent: z.boolean()
});
const pattern = z.object({
  shape: z.array(shape),
  traceCount: z.number().int().nonnegative(),
  traceIds: z.array(z.string()),
  traceIdsTruncated: z.boolean()
});
const edge = z.object({
  sourceService: z.string(),
  targetService: z.string(),
  spanCount: z.number().int().positive(),
  traceCount: z.number().int().positive(),
  exampleTraceId: z.string(),
  exampleParentSpanId: z.string(),
  exampleChildSpanId: z.string()
});
const analysis = z.object({
  rowLimit: z.number().int().positive(),
  scannedRows: z.number().int().nonnegative(),
  truncated: z.boolean(),
  matchedTraces: z.number().int().nonnegative(),
  patterns: z.array(pattern),
  patternsTruncated: z.boolean(),
  edges: z.array(edge),
  edgesTruncated: z.boolean()
});
export type TraceStructureAnalysis = z.infer<typeof analysis>;

export function parseTraceStructureAnalysis(value: unknown): TraceStructureAnalysis {
  const parsed = analysis.safeParse(value);
  if (
    !parsed.success ||
    parsed.data.scannedRows > parsed.data.rowLimit ||
    parsed.data.matchedTraces > parsed.data.scannedRows ||
    (!parsed.data.patternsTruncated &&
      parsed.data.patterns.reduce((sum, pattern) => sum + pattern.traceCount, 0) !== parsed.data.matchedTraces) ||
    parsed.data.edges.some(edge => edge.traceCount > parsed.data.matchedTraces || edge.spanCount < edge.traceCount)
  )
    throw new ExploreSignalContractError('Invalid trace structure analysis response');
  return parsed.data;
}
