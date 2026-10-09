/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { validLogNumericRange } from '@/shared/log-numeric-range';
import { validLogSort } from './explore-log-order';
import { z } from 'zod';
import { parseLogTransactions } from './explore-log-transactions';
import { parseLogCalculated } from './explore-log-calculated';
import { validLogCalculatedV2, validLogExploreModes } from './explore-log-calculated-v2';
import { parseLogSubquery } from './explore-log-subquery';
import {
  parseMetricPlan,
  validateMetricPlan,
  validLogView,
  validLogAnalysis,
  parseMetricView
} from '@/platform/perses';
import { validTraceView } from './explore-trace-view';
import { parseTraceStructure } from './explore-trace-structure';

import { validLogGroupSelection } from '@/shared/log-group-selection';

import {
  LOG_SEVERITY_CATEGORIES,
  exploreHandoffState,
  validTraceStructureQuery,
  type ExploreQuery
} from './explore-query';

import { normalizeInvestigationTimeZone } from '@/shared/query-context';

import { EXPLORE_METRIC_AGGREGATIONS, parseMetricStep, isOrderedTraceDurationRange } from './explore-field-contract';

import { normalizeExploreQuery, EXPLORE_TIME_RANGES } from './explore-url-model';

const text = z.string().trim().min(1);
const optionalText = text.optional();
const timestamp = z.number().int().positive().safe();
const shared = {
  timeRange: z.enum(EXPLORE_TIME_RANGES as ['last-15m', 'last-30m', 'last-1h', 'last-6h', 'last-24h']),
  query: optionalText,
  entityId: optionalText,
  monitorId: optionalText,
  intakeProfileId: optionalText,
  collectorId: optionalText,
  serviceName: optionalText,
  serviceNamespace: optionalText,
  environment: optionalText,
  instance: optionalText,
  endpoint: optionalText,
  windowMode: z.literal('preset').optional(),
  autoRefreshMs: z.union([z.literal(30_000), z.literal(60_000)]).optional(),
  start: timestamp.optional(),
  end: timestamp.optional(),
  timeZone: text.refine(value => Boolean(normalizeInvestigationTimeZone(value))).optional()
};
const correlated = {
  traceId: optionalText,
  spanId: optionalText,
  resourceFilter: optionalText,
  attributeFilter: optionalText,
  hideInternal: z.boolean().optional()
};

const savedQuerySchema = z.discriminatedUnion('signal', [
  z
    .object({
      ...shared,
      signal: z.literal('metrics'),
      operationName: optionalText,
      metricPlan: optionalText,
      metricView: optionalText,
      metricFilter: optionalText,
      groupBy: optionalText,
      aggregation: z.enum(EXPLORE_METRIC_AGGREGATIONS).optional(),
      temporalAggregation: z.enum(['raw', 'rate', 'increase', 'delta']).optional(),
      step: text.refine(value => parseMetricStep(value).valid).optional()
    })
    .strict(),
  z
    .object({
      ...shared,
      ...correlated,
      signal: z.literal('logs'),
      logRecordUid: optionalText,
      logView: optionalText.refine(validLogView),
      logAnalysis: optionalText.refine(validLogAnalysis),
      logAggregation: z.enum(['fields', 'transactions', 'patterns', 'calculated']).optional(),
      logTransactions: z
        .string()
        .optional()
        .refine(value => value === undefined || parseLogTransactions(value) !== undefined),
      logCalculated: z
        .string()
        .optional()
        .refine(value => value === undefined || parseLogCalculated(value) !== undefined),
      logCalculatedV2: z.string().optional().refine(validLogCalculatedV2),
      logSubquery: z
        .string()
        .optional()
        .refine(value => value === undefined || parseLogSubquery(value) !== undefined),
      logReferenceJoin: z.string().optional(),
      logGroupSelection: z.string().optional().refine(validLogGroupSelection),
      logNumericRange: z.string().optional().refine(validLogNumericRange),
      sort: z.enum(['newest', 'oldest']).optional(),
      logSort: optionalText.refine(value => validLogSort(value)),
      live: z.boolean().optional(),
      searchSyntax: z.enum(['structured-v1', 'structured-v2']).optional(),
      severityText: optionalText,
      severityCategory: z.enum(LOG_SEVERITY_CATEGORIES).optional(),
      hideNoise: z.boolean().optional()
    })
    .strict(),
  z
    .object({
      ...shared,
      ...correlated,
      signal: z.literal('traces'),
      traceView: optionalText.refine(validTraceView),
      traceStructure: optionalText.refine(value => value === undefined || parseTraceStructure(value) !== undefined),
      traceStructureView: z.enum(['patterns', 'flow']).optional(),
      endExclusive: z.boolean().optional(),
      errorOnly: z.boolean().optional(),
      sort: z.enum(['newest', 'duration_desc']).optional(),
      spanScope: z.enum(['root', 'entrypoint']).optional(),
      minDurationMs: z.number().int().nonnegative().safe().optional(),
      maxDurationMs: z.number().int().nonnegative().safe().optional()
    })
    .strict()
]);

export function parseSavedExploreQuery(value: unknown): ExploreQuery | undefined {
  const result = savedQuerySchema.safeParse(value);
  if (!result.success) return undefined;
  const query = result.data;
  if (query.signal === 'logs' && !validLogExploreModes(query)) return undefined;
  if (query.signal === 'metrics' && !validMetricComposition(query)) return undefined;
  if (!validSavedTime(query) || exploreHandoffState(query) === 'invalid') return undefined;
  if (query.signal === 'traces' && !isOrderedTraceDurationRange(query.minDurationMs, query.maxDurationMs))
    return undefined;
  if (query.signal === 'traces' && !validTraceStructureQuery(query)) return undefined;
  return normalizeExploreQuery(query);
}

function validSavedTime(query: ExploreQuery) {
  if (query.start == null && query.end == null) return query.timeZone == null;
  return (
    query.start != null &&
    query.end != null &&
    query.start < query.end &&
    query.end - query.start <= 86_400_000 &&
    query.timeZone != null &&
    query.windowMode !== 'preset' &&
    query.autoRefreshMs == null &&
    !(query.signal === 'logs' && query.live)
  );
}

function validMetricComposition(query: Extract<ExploreQuery, { signal: 'metrics' }>) {
  try {
    if (query.metricPlan && validateMetricPlan(parseMetricPlan(query.metricPlan)).length) return false;
    parseMetricView(query.metricView);
    return true;
  } catch {
    return false;
  }
}
