/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import type {
  PublicStatusComponentState,
  PublicStatusHistory,
  PublicStatusIncidentContent,
  PublicStatusIncidentState
} from '../model/public-status-contract';

export const nullablePublicStatusText = z.string().nullable().optional();
export const nullablePublicStatusTime = z.union([z.string(), z.number()]).nullable().optional();
export const publicStatusSafeInteger = z.number().refine(Number.isSafeInteger);
export const publicStatusPositiveInteger = publicStatusSafeInteger.refine(value => value > 0);
export const publicStatusNonNegativeInteger = publicStatusSafeInteger.refine(value => value >= 0);
export const requiredPublicStatusText = z.string().refine(value => value.trim().length > 0);
export const safePublicStatusUrl = requiredPublicStatusText.refine(isSafePublicUrl);
export const safePublicStatusFeedback = z.preprocess(
  // The established backend serializes an unset optional feedback address as an empty string.
  value => (typeof value === 'string' && value.trim().length === 0 ? null : value),
  z
    .union([z.string().email(), requiredPublicStatusText.refine(isSafeHttpUrl)])
    .nullable()
    .optional()
);

export const publicStatusComponentInfoSchema = z
  .object({
    id: publicStatusPositiveInteger,
    orgId: publicStatusPositiveInteger.nullable().optional(),
    name: requiredPublicStatusText,
    description: nullablePublicStatusText,
    labels: z.record(z.string(), z.string()).nullable().optional(),
    method: publicStatusSafeInteger.optional(),
    configState: publicStatusSafeInteger.optional(),
    state: publicStatusSafeInteger,
    creator: nullablePublicStatusText,
    modifier: nullablePublicStatusText,
    gmtCreate: nullablePublicStatusTime,
    gmtUpdate: nullablePublicStatusTime
  })
  .strict();

export const publicStatusHistorySchema = z
  .object({
    id: publicStatusPositiveInteger.nullable().optional(),
    componentId: publicStatusPositiveInteger,
    state: publicStatusSafeInteger,
    timestamp: publicStatusPositiveInteger,
    uptime: z.number().finite().min(0).max(1).nullable().optional(),
    abnormal: publicStatusNonNegativeInteger.nullable().optional(),
    unknowing: publicStatusNonNegativeInteger.nullable().optional(),
    normal: publicStatusNonNegativeInteger.nullable().optional(),
    creator: nullablePublicStatusText,
    modifier: nullablePublicStatusText,
    gmtCreate: nullablePublicStatusTime,
    gmtUpdate: nullablePublicStatusTime
  })
  .strict()
  .transform((value): PublicStatusHistory => ({
    ...(value.id == null ? {} : { id: value.id }),
    componentId: value.componentId,
    state: publicComponentState(value.state),
    timestamp: value.timestamp,
    ...(value.uptime == null ? {} : { uptime: value.uptime }),
    ...(value.abnormal == null ? {} : { abnormal: value.abnormal }),
    ...(value.unknowing == null ? {} : { unknowing: value.unknowing }),
    ...(value.normal == null ? {} : { normal: value.normal })
  }));

export const publicStatusIncidentContentSchema = z
  .object({
    id: publicStatusPositiveInteger,
    incidentId: publicStatusPositiveInteger,
    message: requiredPublicStatusText,
    state: publicStatusSafeInteger,
    timestamp: publicStatusPositiveInteger,
    creator: nullablePublicStatusText,
    modifier: nullablePublicStatusText,
    gmtCreate: nullablePublicStatusTime,
    gmtUpdate: nullablePublicStatusTime
  })
  .strict()
  .transform((value): PublicStatusIncidentContent => ({
    id: value.id,
    incidentId: value.incidentId,
    message: value.message,
    state: publicIncidentState(value.state),
    timestamp: value.timestamp
  }));

// Persisted backend byte codes are a compatibility boundary; future values remain unknown evidence.
export function publicComponentState(value: number): PublicStatusComponentState {
  if (value === 0) return 'healthy';
  if (value === 1) return 'incident';
  return 'unknown';
}

export function publicIncidentState(value: number): PublicStatusIncidentState {
  if (value === 0) return 'investigating';
  if (value === 1) return 'identified';
  if (value === 2) return 'monitoring';
  if (value === 3) return 'resolved';
  return 'unknown';
}

function isSafePublicUrl(value: string) {
  return (value.startsWith('/') && !value.startsWith('//')) || isSafeHttpUrl(value);
}

function isSafeHttpUrl(value: string) {
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}
