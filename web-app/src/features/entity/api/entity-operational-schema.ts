/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import type {
  EntityDetail,
  EntityNextAction,
  EntityNextActionType,
  EntityResponseHandoff,
  EntityResponseHandoffs,
  EntityTriageRecommendation
} from '../model/entity-contract';
import { entityNextActionTypes } from '../model/entity-contract';

const maxHandoffTextLength = 1000;
const count = z.number().int().nonnegative().safe();
const positiveId = z.number().int().positive().safe();
const handoffText = z.string().trim().min(1).max(maxHandoffTextLength).nullish();

const opsSummarySchema = z.object({
  ownerReady: z.boolean(),
  runbookReady: z.boolean(),
  relationReady: z.boolean(),
  telemetryReady: z.boolean(),
  statusReady: z.boolean(),
  readinessScore: z.number().int().min(0).max(100),
  relationCount: count
});

const nextActionSchema = z.object({
  actionType: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(500),
  summary: z.string().trim().min(1).max(2000),
  actionLabel: z.string().trim().min(1).max(500),
  priority: z.number().int().safe()
});

const triageRecommendationSchema = z.object({
  mode: handoffText,
  recommendedFocus: handoffText,
  headline: handoffText,
  summary: handoffText,
  whyNow: handoffText,
  actionLabel: handoffText,
  generatedAt: count.nullish()
});

const responseHandoffSchema = z.object({
  search: handoffText,
  status: handoffText,
  severity: handoffText,
  app: handoffText,
  content: handoffText,
  entityId: positiveId.nullish(),
  entityType: handoffText,
  entityName: handoffText,
  traceId: handoffText,
  spanId: handoffText,
  serviceName: handoffText,
  serviceNamespace: handoffText,
  severityText: handoffText,
  query: handoffText,
  owner: handoffText,
  system: handoffText,
  environment: handoffText,
  start: count.nullish(),
  end: count.nullish(),
  source: handoffText,
  focus: handoffText
});

const responseHandoffsSchema = z.object({
  alerts: responseHandoffSchema.nullish(),
  monitors: responseHandoffSchema.nullish(),
  logs: responseHandoffSchema.nullish(),
  traces: responseHandoffSchema.nullish(),
  discovery: responseHandoffSchema.nullish(),
  editor: responseHandoffSchema.nullish()
});

export const entityOperationalSchema = z.object({
  triageRecommendation: triageRecommendationSchema.nullish(),
  opsSummary: opsSummarySchema.nullish(),
  nextActions: z.array(nextActionSchema).max(5).nullish(),
  responseHandoffs: responseHandoffsSchema.nullish()
});

/**
 * Keeps optional backend guidance behind one feature boundary. Unknown future
 * actions are ignored so a newer server cannot create an untrusted navigation target.
 */
export function mapEntityOperationalDetail(wire: z.output<typeof entityOperationalSchema>): Partial<EntityDetail> {
  return {
    ...(wire.triageRecommendation
      ? { triageRecommendation: clean(wire.triageRecommendation) as EntityTriageRecommendation }
      : {}),
    ...(wire.opsSummary ? { opsSummary: wire.opsSummary } : {}),
    ...(wire.nextActions ? { nextActions: cleanNextActions(wire.nextActions) } : {}),
    ...(wire.responseHandoffs ? { responseHandoffs: cleanResponseHandoffs(wire.responseHandoffs) } : {})
  };
}

function cleanNextActions(actions: z.output<typeof nextActionSchema>[]): EntityNextAction[] {
  return actions
    .filter((action): action is typeof action & { actionType: EntityNextActionType } =>
      entityNextActionTypes.includes(action.actionType as EntityNextActionType)
    )
    .map(action => ({ ...action }));
}

function cleanResponseHandoffs(value: z.output<typeof responseHandoffsSchema>): EntityResponseHandoffs {
  const alerts = cleanResponseHandoff(value.alerts);
  const monitors = cleanResponseHandoff(value.monitors);
  const logs = cleanResponseHandoff(value.logs);
  const traces = cleanResponseHandoff(value.traces);
  const discovery = cleanResponseHandoff(value.discovery);
  const editor = cleanResponseHandoff(value.editor);
  return {
    ...(alerts ? { alerts } : {}),
    ...(monitors ? { monitors } : {}),
    ...(logs ? { logs } : {}),
    ...(traces ? { traces } : {}),
    ...(discovery ? { discovery } : {}),
    ...(editor ? { editor } : {})
  };
}

function cleanResponseHandoff(value: z.output<typeof responseHandoffSchema> | null | undefined) {
  return value ? (clean(value) as EntityResponseHandoff) : undefined;
}

function clean<Value extends object>(value: Value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== null && item !== undefined)) as Value;
}
