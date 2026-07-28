/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import {
  DETECTION_ERROR_CODES,
  DETECTION_STATUSES,
  POLLING_DECISIONS,
  SIGNALS
} from '../model/instrumentation-v2-contract';
import { selection, service, signalValues, text, timestamp } from './instrumentation-v2-schema-parts';

const jumpContext = z
  .object({
    serviceName: text,
    serviceNamespace: text.optional(),
    environment: text.optional(),
    intakeProfileId: text,
    collectorId: text.optional(),
    serviceInstanceId: text.optional(),
    endpoint: text.optional(),
    startedAt: timestamp,
    detectedAt: timestamp
  })
  .strict();

const signalDetection = z
  .object({
    status: z.enum(DETECTION_STATUSES),
    lastReceivedAt: timestamp.optional(),
    errorCode: z.enum(DETECTION_ERROR_CODES).optional()
  })
  .strict()
  .superRefine(validateSignalDetection);

type SignalDetection = z.infer<typeof signalDetection>;

function validateSignalDetection(value: SignalDetection, context: z.RefinementCtx) {
  const valid = {
    received: Boolean(value.lastReceivedAt) && !value.errorCode,
    waiting: !value.lastReceivedAt && value.errorCode === 'signal_not_received',
    unsupported: !value.lastReceivedAt && value.errorCode === 'signal_not_supported',
    unavailable: !value.lastReceivedAt && Boolean(value.errorCode),
    error: Boolean(value.errorCode)
  }[value.status];
  if (!valid) context.addIssue({ code: 'custom', message: `${value.status} signal evidence is invalid` });
}

export const detectionSchema = z
  .object({
    schemaVersion: z.literal(2),
    detectedAt: timestamp,
    context: z
      .object({
        ...selection,
        service,
        intakeProfileId: text,
        collectorId: text.optional(),
        startedAt: timestamp,
        windowEndAt: timestamp
      })
      .strict(),
    signals: signalValues(signalDetection),
    polling: z
      .object({ decision: z.enum(POLLING_DECISIONS), pollAfterMs: timestamp.optional(), deadlineAt: timestamp })
      .strict(),
    queryJumpContext: jumpContext,
    queryJumps: z.array(z.object({ signal: z.enum(SIGNALS), enabled: z.boolean(), context: jumpContext }).strict())
  })
  .strict()
  .superRefine(validateDetection);

type Detection = z.infer<typeof detectionSchema>;

function validateDetection(value: Detection, context: z.RefinementCtx) {
  if (value.queryJumps.length !== SIGNALS.length || new Set(value.queryJumps.map(jump => jump.signal)).size !== 3) {
    context.addIssue({ code: 'custom', message: 'exactly three signal jumps are required' });
  }
  if ((value.polling.decision === 'continue_polling') !== Boolean(value.polling.pollAfterMs)) {
    context.addIssue({ code: 'custom', message: 'polling delay does not match decision' });
  }
  if (!detectionWindowIsValid(value)) {
    context.addIssue({ code: 'custom', message: 'detection window evidence is invalid' });
  }
  if (value.polling.decision !== expectedPollingDecision(value)) {
    context.addIssue({ code: 'custom', message: 'polling decision does not match signal evidence' });
  }
  validateQueryJumps(value, context);
}

function detectionWindowIsValid(value: Detection) {
  const { startedAt, windowEndAt } = value.context;
  const latestEvidence = Math.min(value.detectedAt, windowEndAt);
  const timestamps = Object.values(value.signals)
    .map(signal => signal.lastReceivedAt)
    .filter((timestamp): timestamp is number => timestamp !== undefined);
  return (
    value.detectedAt >= startedAt &&
    windowEndAt > startedAt &&
    value.polling.deadlineAt === windowEndAt &&
    timestamps.every(timestamp => timestamp >= startedAt && timestamp <= latestEvidence)
  );
}

function expectedPollingDecision(value: Detection) {
  const statuses = Object.values(value.signals).map(signal => signal.status);
  if (statuses.some(status => status === 'error' || status === 'unavailable')) return 'manual_retry';
  if (statuses.includes('waiting')) {
    return value.detectedAt < value.context.windowEndAt ? 'continue_polling' : 'manual_retry';
  }
  return 'complete';
}

function validateQueryJumps(value: Detection, context: z.RefinementCtx) {
  const expected = expectedJumpContext(value);
  if (!sameJumpContext(value.queryJumpContext, expected)) {
    context.addIssue({ code: 'custom', message: 'query jump context must match detection context' });
  }
  for (const jump of value.queryJumps) {
    if (!sameJumpContext(jump.context, value.queryJumpContext)) {
      context.addIssue({ code: 'custom', message: 'query jump context must match shared context' });
    }
    if (jump.enabled !== (value.signals[jump.signal].status === 'received')) {
      context.addIssue({ code: 'custom', message: 'query jump enabled state must match received signal' });
    }
  }
}

function expectedJumpContext(value: Detection): z.infer<typeof jumpContext> {
  return {
    serviceName: value.context.service.name,
    serviceNamespace: value.context.service.namespace,
    environment: value.context.service.environment,
    intakeProfileId: value.context.intakeProfileId,
    ...(value.context.collectorId ? { collectorId: value.context.collectorId } : {}),
    ...(value.context.service.serviceInstanceId ? { serviceInstanceId: value.context.service.serviceInstanceId } : {}),
    ...(value.context.service.endpoint ? { endpoint: value.context.service.endpoint } : {}),
    startedAt: value.context.startedAt,
    detectedAt: value.detectedAt
  };
}

function sameJumpContext(left: z.infer<typeof jumpContext>, right: z.infer<typeof jumpContext>) {
  return SIGNAL_CONTEXT_FIELDS.every(field => left[field] === right[field]);
}

const SIGNAL_CONTEXT_FIELDS = [
  'serviceName',
  'serviceNamespace',
  'environment',
  'intakeProfileId',
  'collectorId',
  'serviceInstanceId',
  'endpoint',
  'startedAt',
  'detectedAt'
] as const;
