/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import {
  agentTopologySchema,
  topologySourceTargetWireSchema,
  topologyTargetWireSchema
} from './agent-topology-target-schema';
import { agentTraceSchema, traceSourceTargetWireSchema, traceTargetWireSchema } from './agent-trace-target-schema';
import { agentLogSchema, logSourceTargetWireSchema, logTargetWireSchema } from './agent-log-target-schema';

const maximumExactWindowMs = 12 * 7 * 24 * 60 * 60_000;

const metricSignalSchema = z
  .object({
    type: z.literal('metrics'),
    query: z.string().regex(/^[^.\s]+\.[^.\s]+$/),
    start: z.number().int().positive(),
    end: z.number().int().positive(),
    timezone: z.string().min(1)
  })
  .strict()
  .refine(value => value.start < value.end && value.end - value.start <= maximumExactWindowMs)
  .refine(value => isTimezone(value.timezone));

const metricSignalWireSchema = z
  .object({
    type: z.literal('metrics'),
    query: z.string().regex(/^[^.\s]+\.[^.\s]+$/),
    timeRange: z.null().optional(),
    start: z.number().int().positive(),
    end: z.number().int().positive(),
    timezone: z.string().min(1)
  })
  .strict()
  .refine(value => value.start < value.end && value.end - value.start <= maximumExactWindowMs)
  .refine(value => isTimezone(value.timezone))
  .transform(value => ({
    type: value.type,
    query: value.query,
    start: value.start,
    end: value.end,
    timezone: value.timezone
  }));

export const agentSourceTargetSchema = z.union([
  z.object({ monitorId: z.number().int().positive(), signal: metricSignalSchema }).strict(),
  z.object({ alertId: z.number().int().positive(), alertType: z.literal('single') }).strict(),
  z.object({ entityId: z.number().int().positive() }).strict(),
  z.object({ topology: agentTopologySchema }).strict(),
  z.object({ trace: agentTraceSchema }).strict(),
  z.object({ log: agentLogSchema }).strict()
]);

const monitorTargetWireSchema = z
  .object({
    version: z.string().min(1),
    entityId: z.number().int().positive(),
    monitorId: z.number().int().positive(),
    alertId: z.null().optional(),
    alertType: z.null().optional(),
    collector: z.null().optional(),
    service: z
      .object({
        name: z.string().min(1),
        namespace: z.string().min(1).nullable().optional(),
        environment: z.string().min(1).nullable().optional()
      })
      .strict(),
    signal: metricSignalWireSchema,
    topology: z.null().optional(),
    trace: z.null().optional(),
    log: z.null().optional(),
    authority: authoritySchema()
  })
  .strict()
  .transform(value => ({
    version: value.version,
    entityId: value.entityId,
    monitorId: value.monitorId,
    service: {
      name: value.service.name,
      ...(value.service.namespace ? { namespace: value.service.namespace } : {}),
      ...(value.service.environment ? { environment: value.service.environment } : {})
    },
    signal: value.signal
  }));

const monitorSourceWireSchema = z
  .object({
    version: z.null().optional(),
    monitorId: z.number().int().positive(),
    alertId: z.null().optional(),
    alertType: z.null().optional(),
    entityId: z.null().optional(),
    collector: z.null().optional(),
    signal: metricSignalWireSchema,
    topology: z.null().optional(),
    trace: z.null().optional(),
    log: z.null().optional(),
    service: z.null().optional(),
    authority: z.null().optional()
  })
  .strict()
  .transform(value => ({ monitorId: value.monitorId, signal: value.signal }));

const singleAlertTargetWireSchema = z
  .object({
    version: z.literal('single-alert.v1'),
    monitorId: z.null().optional(),
    alertId: z.number().int().positive(),
    alertType: z.literal('single'),
    entityId: z.null().optional(),
    collector: z.null().optional(),
    signal: z.null().optional(),
    topology: z.null().optional(),
    trace: z.null().optional(),
    log: z.null().optional(),
    service: z.null().optional(),
    authority: authoritySchema()
  })
  .strict()
  .transform(value => ({ version: value.version, alertId: value.alertId, alertType: value.alertType }));

const singleAlertSourceWireSchema = z
  .object({
    version: z.null().optional(),
    monitorId: z.null().optional(),
    alertId: z.number().int().positive(),
    alertType: z.literal('single'),
    entityId: z.null().optional(),
    collector: z.null().optional(),
    signal: z.null().optional(),
    topology: z.null().optional(),
    trace: z.null().optional(),
    log: z.null().optional(),
    service: z.null().optional(),
    authority: z.null().optional()
  })
  .strict()
  .transform(value => ({ alertId: value.alertId, alertType: value.alertType }));

const entityTargetWireSchema = z
  .object({
    version: z.literal('entity.v1'),
    monitorId: z.null().optional(),
    alertId: z.null().optional(),
    alertType: z.null().optional(),
    entityId: z.number().int().positive(),
    collector: z.null().optional(),
    signal: z.null().optional(),
    topology: z.null().optional(),
    trace: z.null().optional(),
    log: z.null().optional(),
    service: z.null().optional(),
    authority: authoritySchema('entity-authority.v1')
  })
  .strict()
  .refine(value => value.authority.bindingId === value.entityId)
  .transform(value => ({ version: value.version, entityId: value.entityId }));

const entitySourceWireSchema = z
  .object({
    version: z.null().optional(),
    monitorId: z.null().optional(),
    alertId: z.null().optional(),
    alertType: z.null().optional(),
    entityId: z.number().int().positive(),
    collector: z.null().optional(),
    signal: z.null().optional(),
    topology: z.null().optional(),
    trace: z.null().optional(),
    log: z.null().optional(),
    service: z.null().optional(),
    authority: z.null().optional()
  })
  .strict()
  .transform(value => ({ entityId: value.entityId }));

export const agentSourceTargetWireSchema = z.union([
  monitorSourceWireSchema,
  singleAlertSourceWireSchema,
  entitySourceWireSchema,
  topologySourceTargetWireSchema,
  traceSourceTargetWireSchema,
  logSourceTargetWireSchema
]);

export const agentRunTargetSchema = z.union([
  monitorTargetWireSchema,
  singleAlertTargetWireSchema,
  entityTargetWireSchema,
  topologyTargetWireSchema(authoritySchema('topology-authority.v1')),
  traceTargetWireSchema,
  logTargetWireSchema,
  agentSourceTargetWireSchema
]);

function authoritySchema(version?: 'entity-authority.v1' | 'topology-authority.v1') {
  return z
    .object({
      bindingId: z.number().int().positive(),
      version: version ? z.literal(version) : z.string().min(1),
      hash: version ? z.string().regex(/^sha256:[0-9a-f]{64}$/) : z.string().min(1)
    })
    .strict();
}

function isTimezone(value: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}
