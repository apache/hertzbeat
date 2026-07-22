/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import { createSpringPageSchema } from '@/shared/pagination';
import {
  EntityContractError,
  type EntityDetail,
  type EntityEvidenceSummary,
  type EntityIdentity,
  type EntityMonitor,
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
const detailSchema = z.object({
  entity: z.object({
    entity: entitySchema,
    identities: z.array(identitySchema).nullish(),
    monitorBinds: z.array(z.unknown()).nullish(),
    relations: z.array(z.unknown()).nullish()
  }),
  status: statusSchema.nullish(),
  evidenceSummary: evidenceSchema.nullish(),
  boundMonitors: z.array(monitorSchema).nullish(),
  topologyNeighbors: z.array(relationSchema).nullish()
});

export function parseEntityPage(value: unknown): EntityPage {
  const parsed = createSpringPageSchema(summarySchema).safeParse(value);
  if (!parsed.success) throw new EntityContractError();
  return { ...parsed.data, content: parsed.data.content.map(mapSummary) };
}

export function parseEntityDetail(value: unknown): EntityDetail {
  const parsed = detailSchema.safeParse(value);
  if (!parsed.success) throw new EntityContractError();
  const wire = parsed.data;
  return {
    entity: mapEntity(wire.entity.entity),
    identities: (wire.entity.identities ?? []).map(value => clean(value) as EntityIdentity),
    ...(wire.status ? { status: clean(wire.status) as EntityStatus } : {}),
    ...(wire.evidenceSummary ? { evidence: clean(wire.evidenceSummary) as EntityEvidenceSummary } : {}),
    boundMonitors: (wire.boundMonitors ?? []).map(value => clean(value) as EntityMonitor),
    relations: (wire.topologyNeighbors ?? []).map(value => clean(value) as EntityRelation)
  };
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
