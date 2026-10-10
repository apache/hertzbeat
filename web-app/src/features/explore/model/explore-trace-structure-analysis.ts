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
