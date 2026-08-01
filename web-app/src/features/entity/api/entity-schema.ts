/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import { createSpringPageSchema } from '@/shared/pagination';
import {
  EntityContractError,
  type EntityDetail,
  type EntityEvidenceSummary,
  type EntityIdentity,
  type EntityMonitor,
  type EntityMonitorPage,
  type EntityNoiseControlSummary,
  type EntityPage,
  type EntityRecord,
  type EntityRelation,
  type EntityStatus,
  type EntitySummary
} from '../model/entity-contract';

const positiveId = z.number().int().positive().safe();
const count = z.number().int().nonnegative().safe();
const text = z.string().trim().min(1);
const optionalText = z.string().nullish();
const timestamp = z.string().nullish();

const entitySchema = z.object({
  id: positiveId,
  type: text,
  name: text,
  displayName: optionalText,
  environment: optionalText,
  status: optionalText,
  owner: optionalText,
  source: optionalText,
  lifecycle: optionalText,
  tier: optionalText,
  system: optionalText,
  description: optionalText,
  labels: z.record(z.string(), z.string()).nullish(),
  tags: z.array(z.string()).nullish(),
  gmtCreate: timestamp,
  gmtUpdate: timestamp
});

const statusSchema = z.object({
  status: optionalText,
  reason: optionalText,
  monitorTotal: count.optional(),
  monitorUpCount: count.optional(),
  monitorDownCount: count.optional(),
  monitorPausedCount: count.optional(),
  activeAlertCount: count.optional(),
  evaluatedAt: timestamp
});

const summarySchema = z.object({
  entity: entitySchema,
  identityCount: count,
  monitorCount: count,
  relationCount: count,
  activeAlertCount: count,
  status: statusSchema.nullish(),
  lastEvidenceAt: count.nullish()
});

const entityPageResponseSchema = z
  .object({
    content: z.array(summarySchema),
    totalElements: count,
    pageIndex: count,
    pageSize: z.number().int().positive().safe()
  })
  .strict();

const identitySchema = z.object({
  id: positiveId.nullish(),
  identityType: text,
  identityKey: text,
  identityValue: text,
  primaryIdentity: z.boolean().optional()
});
const monitorSchema = z.object({
  id: positiveId,
  name: text,
  app: text,
  instance: optionalText,
  status: z.number().int().optional()
});
const relationSchema = z.object({
  relationId: positiveId.nullish(),
  entityId: positiveId.nullish(),
  entityName: optionalText,
  entityType: optionalText,
  direction: optionalText,
  relationType: optionalText,
  relationSource: optionalText,
  status: optionalText,
  targetRef: optionalText
});
const evidenceSchema = z.object({
  activeAlertCount: count.optional(),
  downMonitorCount: count.optional(),
  healthyMonitorCount: count.optional(),
  identityCount: count.optional(),
  logHintCount: count.optional(),
  lastEvidenceAt: count.nullish()
});
const noiseControlRuleSchema = z.object({
  id: positiveId,
  name: text,
  type: z.enum(['silence', 'inhibit']),
  global: z.boolean(),
  matchedLabels: z.array(text),
  updatedAt: count.nullish()
});
const noiseControlSummarySchema = z
  .object({
    activeSilenceCount: count,
    matchingInhibitCount: count,
    activeSilences: z.array(noiseControlRuleSchema),
    matchingInhibits: z.array(noiseControlRuleSchema),
    possibleAlertSuppression: z.boolean()
  })
  // The backend returns at most three preview rules, while the counts describe every match.
  .refine(value => value.activeSilences.every(rule => rule.type === 'silence'))
  .refine(value => value.matchingInhibits.every(rule => rule.type === 'inhibit'))
  .refine(value => value.activeSilenceCount >= value.activeSilences.length)
  .refine(value => value.matchingInhibitCount >= value.matchingInhibits.length);
const richEvidenceSchema = z.record(z.string(), z.unknown());
const monitorSummarySchema = richEvidenceSchema.and(z.object({ totalBoundMonitors: count }));
const detailSchema = z.object({
  entity: z.object({
    entity: entitySchema,
    identities: z.array(identitySchema).nullish(),
    monitorBinds: z.array(z.unknown()).nullish(),
    relations: z.array(z.unknown()).nullish()
  }),
  status: statusSchema.nullish(),
  evidenceSummary: evidenceSchema.nullish(),
  noiseControlSummary: noiseControlSummarySchema.nullish(),
  monitorSummary: monitorSummarySchema.nullish(),
  logSummary: richEvidenceSchema.nullish(),
  traceSummary: richEvidenceSchema.nullish(),
  metricEvidence: z.array(richEvidenceSchema).nullish(),
  logEvidence: z.array(richEvidenceSchema).nullish(),
  traceEvidence: z.array(richEvidenceSchema).nullish(),
  unifiedEvidenceSummary: richEvidenceSchema.nullish(),
  triageRecommendation: richEvidenceSchema.nullish(),
  boundMonitors: z.array(monitorSchema).nullish(),
  topologyNeighbors: z.array(relationSchema).nullish()
});

export function parseEntityPage(value: unknown): EntityPage {
  const parsed = entityPageResponseSchema.safeParse(value);
  if (!parsed.success) throw new EntityContractError();
  const page = parsed.data;
  // EntityController publishes the manager's stable PageResponse contract.
  // Translate wire names here so the rest of the feature uses one pagination model.
  return {
    content: page.content.map(mapSummary),
    totalElements: page.totalElements,
    totalPages: Math.ceil(page.totalElements / page.pageSize),
    number: page.pageIndex,
    size: page.pageSize
  };
}

export function parseEntityDetail(value: unknown): EntityDetail {
  const parsed = detailSchema.safeParse(value);
  if (!parsed.success) throw new EntityContractError();
  const wire = parsed.data;
  const monitorItems = (wire.boundMonitors ?? []).map(value => clean(value) as EntityMonitor);
  const totalMonitors = wire.monitorSummary?.totalBoundMonitors ?? monitorItems.length;
  if (totalMonitors < monitorItems.length) {
    throw new EntityContractError('Entity monitor preview exceeds its reported total');
  }
  return {
    entity: mapEntity(wire.entity.entity),
    identities: (wire.entity.identities ?? []).map(value => clean(value) as EntityIdentity),
    ...(wire.status ? { status: clean(wire.status) as EntityStatus } : {}),
    ...(wire.evidenceSummary ? { evidence: clean(wire.evidenceSummary) as EntityEvidenceSummary } : {}),
    ...(wire.noiseControlSummary ? { noiseControls: cleanNoiseControlSummary(wire.noiseControlSummary) } : {}),
    monitorPreview: {
      items: monitorItems,
      total: totalMonitors,
      complete: monitorItems.length >= totalMonitors
    },
    ...copyRichDetail(wire),
    relations: (wire.topologyNeighbors ?? []).map(value => clean(value) as EntityRelation)
  };
}

export function parseEntityMonitorPage(value: unknown): EntityMonitorPage {
  const parsed = createSpringPageSchema(monitorSchema).safeParse(value);
  if (!parsed.success) throw new EntityContractError();
  return { ...parsed.data, content: parsed.data.content.map(item => clean(item) as EntityMonitor) };
}

function copyRichDetail(wire: z.output<typeof detailSchema>) {
  return {
    ...(wire.monitorSummary ? { monitorSummary: wire.monitorSummary } : {}),
    ...(wire.logSummary ? { logSummary: wire.logSummary } : {}),
    ...(wire.traceSummary ? { traceSummary: wire.traceSummary } : {}),
    ...(wire.metricEvidence ? { metricEvidence: wire.metricEvidence } : {}),
    ...(wire.logEvidence ? { logEvidence: wire.logEvidence } : {}),
    ...(wire.traceEvidence ? { traceEvidence: wire.traceEvidence } : {}),
    ...(wire.unifiedEvidenceSummary ? { unifiedEvidenceSummary: wire.unifiedEvidenceSummary } : {}),
    ...(wire.triageRecommendation ? { triageRecommendation: wire.triageRecommendation } : {})
  };
}

function cleanNoiseControlSummary(value: z.output<typeof noiseControlSummarySchema>): EntityNoiseControlSummary {
  return {
    ...value,
    activeSilences: value.activeSilences.map(cleanNoiseControlRule),
    matchingInhibits: value.matchingInhibits.map(cleanNoiseControlRule)
  };
}

function cleanNoiseControlRule(rule: z.output<typeof noiseControlRuleSchema>) {
  const { updatedAt, ...required } = rule;
  return { ...required, ...(updatedAt == null ? {} : { updatedAt }) };
}

function mapSummary(wire: z.output<typeof summarySchema>): EntitySummary {
  return {
    ...mapEntity(wire.entity),
    identityCount: wire.identityCount,
    monitorCount: wire.monitorCount,
    relationCount: wire.relationCount,
    activeAlertCount: wire.activeAlertCount,
    ...(wire.status ? { statusEvidence: clean(wire.status) as EntityStatus } : {}),
    ...(wire.lastEvidenceAt == null ? {} : { lastEvidenceAt: wire.lastEvidenceAt })
  };
}

function mapEntity(wire: z.output<typeof entitySchema>): EntityRecord {
  return clean(wire) as EntityRecord;
}

function clean<Value extends object>(value: Value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== null && item !== undefined)) as Value;
}
