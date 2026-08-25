/* Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements. */

import { z } from 'zod';

const maximumWindowMs = 7 * 24 * 60 * 60_000;
const safeId = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u);
const severitySchema = z.enum(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']);

export const agentLogSchema = z
  .object({
    start: z.number().int().positive(),
    end: z.number().int().positive(),
    traceId: safeId.optional(),
    spanId: safeId.optional(),
    severityNumber: z.number().int().min(1).max(24).optional(),
    severityText: severitySchema.optional(),
    search: boundedText(256).optional(),
    serviceName: boundedText(512).optional(),
    serviceNamespace: boundedText(512).optional(),
    environment: boundedText(512).optional(),
    resourceFilter: boundedText(2_048).optional(),
    attributeFilter: boundedText(2_048).optional(),
    hideInternal: z.boolean(),
    hideNoise: z.boolean(),
    pageIndex: z.number().int().min(0).max(10_000),
    pageSize: z.number().int().min(1).max(100)
  })
  .strict()
  .refine(value => value.start < value.end && value.end - value.start <= maximumWindowMs);

const agentLogWireSchema = z
  .object({
    start: z.number().int().positive(),
    end: z.number().int().positive(),
    traceId: safeId.nullable().optional(),
    spanId: safeId.nullable().optional(),
    severityNumber: z.number().int().min(1).max(24).nullable().optional(),
    severityText: severitySchema.nullable().optional(),
    search: boundedText(256).nullable().optional(),
    serviceName: boundedText(512).nullable().optional(),
    serviceNamespace: boundedText(512).nullable().optional(),
    environment: boundedText(512).nullable().optional(),
    resourceFilter: boundedText(2_048).nullable().optional(),
    attributeFilter: boundedText(2_048).nullable().optional(),
    hideInternal: z.boolean(),
    hideNoise: z.boolean(),
    pageIndex: z.number().int().min(0).max(10_000),
    pageSize: z.number().int().min(1).max(100)
  })
  .strict()
  .refine(value => value.start < value.end && value.end - value.start <= maximumWindowMs)
  .transform(value => ({
    start: value.start,
    end: value.end,
    ...(value.traceId ? { traceId: value.traceId } : {}),
    ...(value.spanId ? { spanId: value.spanId } : {}),
    ...(value.severityNumber != null ? { severityNumber: value.severityNumber } : {}),
    ...(value.severityText ? { severityText: value.severityText } : {}),
    ...(value.search ? { search: value.search } : {}),
    ...(value.serviceName ? { serviceName: value.serviceName } : {}),
    ...(value.serviceNamespace ? { serviceNamespace: value.serviceNamespace } : {}),
    ...(value.environment ? { environment: value.environment } : {}),
    ...(value.resourceFilter ? { resourceFilter: value.resourceFilter } : {}),
    ...(value.attributeFilter ? { attributeFilter: value.attributeFilter } : {}),
    hideInternal: value.hideInternal,
    hideNoise: value.hideNoise,
    pageIndex: value.pageIndex,
    pageSize: value.pageSize
  }));

export const logSourceTargetWireSchema = z
  .object({
    version: z.null().optional(),
    monitorId: z.null().optional(),
    alertId: z.null().optional(),
    alertType: z.null().optional(),
    entityId: z.null().optional(),
    collector: z.null().optional(),
    signal: z.null().optional(),
    topology: z.null().optional(),
    trace: z.null().optional(),
    log: agentLogWireSchema,
    service: z.null().optional(),
    authority: z.null().optional()
  })
  .strict()
  .transform(value => ({ log: value.log }));

export const logTargetWireSchema = z
  .object({
    version: z.literal('log-page.v1'),
    monitorId: z.null().optional(),
    alertId: z.null().optional(),
    alertType: z.null().optional(),
    entityId: z.null().optional(),
    collector: z.null().optional(),
    signal: z.null().optional(),
    topology: z.null().optional(),
    trace: z.null().optional(),
    log: agentLogWireSchema,
    service: z.null().optional(),
    authority: z
      .object({
        bindingId: z.null(),
        version: z.literal('log-page-authority.v1'),
        hash: z.string().regex(/^sha256:[0-9a-f]{64}$/u)
      })
      .strict()
  })
  .strict()
  .transform(value => ({ version: value.version, log: value.log }));

function boundedText(maximum: number) {
  return z
    .string()
    .trim()
    .min(1)
    .max(maximum)
    .refine(value => !hasControlCharacter(value));
}

function hasControlCharacter(value: string) {
  return [...value].some(character => {
    const code = character.codePointAt(0) ?? 0;
    return code < 32 || code === 127;
  });
}
