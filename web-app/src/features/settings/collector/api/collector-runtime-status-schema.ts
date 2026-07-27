/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import {
  collectorRuntimeFailureCodes,
  collectorRuntimeStates,
  type CollectorRuntimeReport
} from '../model/collector-runtime-report-model';
import { CollectorContractError } from '../model/collector-model';

const instantSchema = z.string().datetime({ offset: true });
const sourceStatusSchema = z
  .object({
    type: z.enum(['HOST_METRICS', 'PROMETHEUS', 'FILE_LOG']),
    name: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/),
    revision: z.number().int().positive().safe(),
    state: z.enum(['DESIRED', 'ACTIVE', 'REJECTED']),
    lastError: z.string().max(512)
  })
  .strict();
const runtimeStatusSchema = z
  .object({
    schemaVersion: z.union([z.literal(1), z.literal(2)]),
    enabled: z.boolean(),
    state: z.enum(collectorRuntimeStates),
    desiredRevision: z.number().int().positive().safe(),
    activeRevision: z.number().int().nonnegative().safe(),
    pid: z.number().int().min(-1).safe(),
    intakeCredentialState: z.enum(['NOT_REQUIRED', 'MISSING', 'CONFIGURED']),
    restartCount: z.number().int().nonnegative().safe(),
    changedAt: instantSchema,
    lastError: z.string().max(512),
    failureCode: z.enum(collectorRuntimeFailureCodes),
    // Telemetry diagnostics are validated by their owning surface and
    // discarded here; Collector settings needs only safe revision evidence.
    telemetry: z.unknown(),
    sources: z.array(sourceStatusSchema)
  })
  .strict();

export function parseCollectorRuntimeReport(value: unknown, reportedAt: unknown): CollectorRuntimeReport | null {
  if (value === null && reportedAt === null) return null;
  const status = runtimeStatusSchema.safeParse(value);
  const timestamp = instantSchema.safeParse(reportedAt);
  if (!status.success || !timestamp.success) throw new CollectorContractError();
  return {
    schemaVersion: status.data.schemaVersion,
    enabled: status.data.enabled,
    state: status.data.state,
    desiredRevision: status.data.desiredRevision,
    activeRevision: status.data.activeRevision,
    failureCode: status.data.failureCode,
    // The backend explicitly marks rejected source revisions. Failure codes
    // alone can describe unrelated runtime health and cannot prove rejection.
    rejectedRevisions: [
      ...new Set(status.data.sources.filter(({ state }) => state === 'REJECTED').map(({ revision }) => revision))
    ],
    reportedAt: timestamp.data
  };
}
