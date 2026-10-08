/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { logAnalysisStateSchema } from '../logs/log-analysis';
import { logViewSchema, validLogView } from '../logs/log-view';
import { logGroupSelectionSchema, validLogGroupSelection } from '@/shared/log-group-selection';
/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { logNumericRangeSchema } from '@/shared/log-numeric-range';
import { parseLogCalculatedV2 } from '@/shared/log-calculated-v2';
import { z } from 'zod';
import { logFieldSortSchema } from '@/shared/log-sort';
import { metricPlanSchema, metricRollupControlSchema, validateMetricPlan } from '../metrics/metric-plan';

const boundedText = z.string().trim().min(1).max(512);
const identifier = z.string().trim().min(1).max(256);
const traceIdentifier = z.string().regex(/^[0-9a-f]{32}$/u);
const spanIdentifier = z.string().regex(/^[0-9a-f]{16}$/u);
const JAVA_LONG_MAX = '9223372036854775807';
const entityId = z
  .string()
  .regex(/^[1-9]\d{0,18}$/u)
  .refine(value => value.length < JAVA_LONG_MAX.length || value <= JAVA_LONG_MAX);

const contextSchema = z
  .object({
    entityId: entityId.optional(),
    entityType: z
      .string()
      .regex(/^[A-Za-z0-9_.:-]{1,128}$/u)
      .optional(),
    serviceName: identifier.optional(),
    serviceNamespace: identifier.optional(),
    environment: identifier.optional(),
    collectorId: z
      .string()
      .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u)
      .optional(),
    instance: identifier.optional(),
    endpoint: boundedText.optional()
  })
  .strict();

const timeWindowSchema = z
  .object({
    from: z.number().int().safe().positive(),
    to: z.number().int().safe().positive()
  })
  .strict()
  .refine(window => window.from < window.to, 'Query time window must be ordered')
  .refine(window => window.to - window.from <= 24 * 60 * 60 * 1_000, 'Query time window is too large');

export const HERTZBEAT_QUERY_LIMITS = {
  metricSeries: 32,
  metricPointsPerSeries: 1_200,
  tableRows: 1_000,
  maximumWindowMs: 24 * 60 * 60 * 1_000
} as const;

const baseQueryShape = {
  timeWindow: timeWindowSchema,
  context: contextSchema.optional()
};

const metricQuerySchema = z
  .object({
    signal: z.literal('metrics'),
    queryKind: z.literal('time-series'),
    ...baseQueryShape,
    metric: z
      .object({
        name: z.string().regex(/^[A-Za-z_:][A-Za-z0-9_:.-]{0,255}$/u),
        aggregation: z.enum(['avg', 'sum', 'min', 'max', 'count']).optional(),
        temporalAggregation: z
          .union([z.enum(['raw', 'rate', 'increase', 'delta']), metricRollupControlSchema])
          .optional(),
        stepSeconds: z.number().int().positive().max(86_400).optional(),
        operationName: boundedText.optional(),
        metricFilter: z.string().max(1024).optional(),
        groupBy: z.string().max(1024).optional()
      })
      .strict(),
    limit: z.number().int().positive().max(HERTZBEAT_QUERY_LIMITS.metricSeries).optional()
  })
  .strict();

const metricCompositionQuerySchema = z
  .object({
    signal: z.literal('metrics'),
    queryKind: z.literal('composition'),
    ...baseQueryShape,
    plan: metricPlanSchema.refine(plan => validateMetricPlan(plan).length === 0),
    operationName: boundedText.optional(),
    limit: z.number().int().positive().max(HERTZBEAT_QUERY_LIMITS.metricSeries).optional()
  })
  .strict();

const logTableShape = {
  signal: z.literal('logs'),
  queryKind: z.literal('table'),
  ...baseQueryShape,
  search: z.string().trim().min(1).max(8192).optional(),
  searchSyntax: z.enum(['structured-v1', 'structured-v2']).optional(),
  logCalculatedV2: z
    .string()
    .refine(value => parseLogCalculatedV2(value) !== undefined)
    .optional(),
  sort: z.enum(['newest', 'oldest']).optional(),
  logSort: logFieldSortSchema.optional(),
  logNumericRange: logNumericRangeSchema.optional(),
  severity: boundedText.optional(),
  severityCategory: z.enum(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']).optional(),
  resourceFilter: z.string().max(1024).optional(),
  attributeFilter: z.string().max(1024).optional(),
  traceId: identifier.optional(),
  spanId: identifier.optional(),
  hideInternal: z.boolean().optional(),
  hideNoise: z.boolean().optional(),
  limit: z.number().int().positive().max(HERTZBEAT_QUERY_LIMITS.tableRows).optional()
};
const logTableQuerySchema = z
  .object(logTableShape)
  .strict()
  .refine(query => !query.logSort || query.sort !== 'oldest', { path: ['logSort'] })
  .refine(query => query.searchSyntax !== undefined || (query.search?.length ?? 0) <= 512, {
    path: ['search'],
    message: 'Legacy log search exceeds 512 characters'
  })
  .refine(query => query.logCalculatedV2 === undefined || query.searchSyntax === 'structured-v2', {
    path: ['logCalculatedV2']
  })
  .refine(query => query.logCalculatedV2 !== undefined || query.searchSyntax !== 'structured-v2', {
    path: ['searchSyntax']
  })
  .refine(query => query.logCalculatedV2 === undefined || (query.limit ?? 20) === 20, { path: ['limit'] })
  .refine(query => query.logCalculatedV2 === undefined || query.context?.entityType === undefined, {
    path: ['context']
  })
  .refine(
    query => {
      if (!query.logCalculatedV2 || !query.logSort?.field.startsWith('calculated:')) return true;
      const name = query.logSort.field.slice('calculated:'.length);
      const definitions = parseLogCalculatedV2(query.logCalculatedV2)!;
      return definitions.fields.some(field =>
        field.kind === 'formula' ? field.name === name : field.captures.some(capture => capture.name === name)
      );
    },
    { path: ['logSort'] }
  );

const logAnalysisQuerySchema = z
  .object({
    ...logTableShape,
    queryKind: z.literal('analysis'),
    search: z.string().max(8192).optional(),
    analysis: logAnalysisStateSchema.refine(
      value => value.representation !== 'logs' && JSON.stringify(value).length <= 20000
    ),
    logGroupSelection: logGroupSelectionSchema
      .refine(value => validLogGroupSelection(JSON.stringify(value)))
      .optional(),
    returnView: logViewSchema.refine(value => validLogView(JSON.stringify(value))).optional()
  })
  .strict()
  .refine(query => query.logCalculatedV2 === undefined, { path: ['logCalculatedV2'] })
  .refine(query => query.searchSyntax !== 'structured-v2', { path: ['searchSyntax'] })
  .refine(query => !query.logSort || query.sort !== 'oldest', { path: ['logSort'] })
  .refine(query => query.searchSyntax !== undefined || (query.search?.length ?? 0) <= 512, { path: ['search'] });

const traceSearchShape = {
  signal: z.literal('traces'),
  ...baseQueryShape,
  endExclusive: z.boolean().optional(),
  operationName: boundedText.optional(),
  errorOnly: z.boolean().optional(),
  minDurationMs: z.number().int().nonnegative().safe().optional(),
  maxDurationMs: z.number().int().nonnegative().safe().optional(),
  spanScope: z.enum(['root', 'entrypoint']).optional(),
  hideInternal: z.boolean().optional(),
  resourceFilter: z.string().max(1024).optional(),
  attributeFilter: z.string().max(1024).optional()
};
const orderedDuration = (query: { minDurationMs?: number | undefined; maxDurationMs?: number | undefined }) =>
  query.minDurationMs == null || query.maxDurationMs == null || query.minDurationMs <= query.maxDurationMs;
const traceTableQuerySchema = z
  .object({
    ...traceSearchShape,
    queryKind: z.literal('table'),
    sort: z.enum(['newest', 'duration_desc']).optional(),
    limit: z.number().int().positive().max(HERTZBEAT_QUERY_LIMITS.tableRows).optional()
  })
  .strict()
  .refine(orderedDuration);
const traceSpansQuerySchema = z
  .object({
    ...traceSearchShape,
    queryKind: z.literal('spans'),
    sort: z.enum(['newest', 'duration_desc']).optional(),
    limit: z.number().int().positive().max(100).optional()
  })
  .strict()
  .refine(orderedDuration);
const traceGroupsQuerySchema = z
  .object({
    ...traceSearchShape,
    queryKind: z.literal('groups'),
    population: z.enum(['matched_traces', 'matched_spans']),
    groupBy: z.enum(['serviceName', 'operationName', 'environment']),
    orderBy: z.enum(['count-desc', 'error-count-desc']).optional(),
    limit: z.number().int().positive().max(100).optional()
  })
  .strict()
  .refine(orderedDuration);

const traceGanttQuerySchema = z
  .object({
    signal: z.literal('traces'),
    queryKind: z.literal('gantt'),
    ...baseQueryShape,
    traceId: traceIdentifier,
    spanId: spanIdentifier.optional()
  })
  .strict();

export const hertzBeatQuerySchema = z.union([
  metricQuerySchema,
  metricCompositionQuerySchema,
  logTableQuerySchema,
  logAnalysisQuerySchema,
  traceTableQuerySchema,
  traceSpansQuerySchema,
  traceGroupsQuerySchema,
  traceGanttQuerySchema
]);

export type HertzBeatQuery = z.infer<typeof hertzBeatQuerySchema>;
export type HertzBeatMetricCompositionQuery = z.infer<typeof metricCompositionQuerySchema>;
export type HertzBeatMetricQuery = z.infer<typeof metricQuerySchema>;
export type HertzBeatLogAnalysisQuery = z.infer<typeof logAnalysisQuerySchema>;
export type HertzBeatLogTableQuery = z.infer<typeof logTableQuerySchema>;
export type HertzBeatTraceSpansQuery = z.infer<typeof traceSpansQuerySchema>;
export type HertzBeatTraceGroupsQuery = z.infer<typeof traceGroupsQuerySchema>;
export type HertzBeatTraceTableQuery = z.infer<typeof traceTableQuerySchema>;
export type HertzBeatTraceGanttQuery = z.infer<typeof traceGanttQuerySchema>;

type HertzBeatQueryFailureKind = 'invalid_request' | 'permission' | 'overloaded' | 'unavailable' | 'contract_error';

export type HertzBeatQueryFailure = {
  kind: HertzBeatQueryFailureKind;
  messageKey:
    | 'perses.query.invalid'
    | 'perses.query.permission'
    | 'perses.query.overloaded'
    | 'perses.query.unavailable'
    | 'perses.query.contract';
  retryable: boolean;
};

export type HertzBeatTraceQueryCoverage = {
  sort: 'newest' | 'duration_desc';
  coverage: 'window' | 'bounded';
  rowLimit: 1500 | 5000 | null;
  truncated: boolean | null;
};

export type HertzBeatQueryOutcome<T> =
  | { state: 'ready'; data: T; truncated: boolean | 'unknown'; query?: HertzBeatTraceQueryCoverage }
  | { state: 'empty'; truncated: boolean | 'unknown'; query?: HertzBeatTraceQueryCoverage }
  | { state: 'error'; error: HertzBeatQueryFailure };
