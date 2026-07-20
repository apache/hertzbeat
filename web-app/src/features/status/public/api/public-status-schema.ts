/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import type {
  PublicStatusComponent,
  PublicStatusComponentState,
  PublicStatusIncident,
  PublicStatusIncidentPage,
  PublicStatusIncidentState,
  PublicStatusOrg,
  PublicStatusOrgState
} from '../model/public-status-contract';

const nullableText = z.string().nullable().optional();
const nullableTime = z.union([z.string(), z.number()]).nullable().optional();
const state = z.number().int();

const publicStatusOrgWireSchema = z
  .object({
    id: z.number().int().positive().nullable().optional(),
    name: z.string(),
    description: z.string(),
    home: nullableText,
    logo: nullableText,
    feedback: nullableText,
    color: nullableText,
    state,
    creator: nullableText,
    modifier: nullableText,
    gmtCreate: nullableTime,
    gmtUpdate: nullableTime
  })
  .strict()
  .transform((value): PublicStatusOrg => ({
    name: value.name,
    description: value.description,
    ...(value.home == null ? {} : { home: value.home }),
    state: publicOrgState(value.state),
    ...(value.color == null ? {} : { color: value.color })
  }));

const componentInfoSchema = z
  .object({
    id: z.number().int().positive(),
    orgId: z.number().int().positive().nullable().optional(),
    name: z.string(),
    description: nullableText,
    labels: z.record(z.string(), z.string()).nullable().optional(),
    method: state.optional(),
    configState: state.optional(),
    state,
    creator: nullableText,
    modifier: nullableText,
    gmtCreate: nullableTime,
    gmtUpdate: nullableTime
  })
  .strict();

const publicStatusComponentWireSchema = z
  .object({
    info: componentInfoSchema,
    history: z.array(z.unknown()).nullable().optional()
  })
  .strict()
  .transform(({ info }): PublicStatusComponent => ({
    id: info.id,
    name: info.name,
    ...(info.description == null ? {} : { description: info.description }),
    state: publicComponentState(info.state)
  }));

const publicStatusIncidentSchema = z
  .object({
    id: z.number().int().positive(),
    orgId: z.number().int().positive().nullable().optional(),
    name: z.string(),
    state,
    startTime: z.number().nullable().optional(),
    endTime: z.number().nullable().optional(),
    creator: nullableText,
    modifier: nullableText,
    gmtCreate: nullableTime,
    gmtUpdate: nullableTime,
    components: z.array(z.unknown()).nullable().optional(),
    contents: z.array(z.unknown()).nullable().optional()
  })
  .strict()
  .transform((value): PublicStatusIncident => ({
    id: value.id,
    name: value.name,
    state: publicIncidentState(value.state),
    ...(value.startTime == null ? {} : { startTime: value.startTime }),
    ...(value.endTime == null ? {} : { endTime: value.endTime })
  }));

const publicStatusIncidentPageSchema = z
  .object({
    content: z.array(publicStatusIncidentSchema),
    totalElements: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
    number: z.number().int().nonnegative(),
    size: z.number().int().positive(),
    pageable: z.unknown().optional(),
    last: z.boolean().optional(),
    sort: z.unknown().optional(),
    first: z.boolean().optional(),
    numberOfElements: z.number().int().nonnegative().optional(),
    empty: z.boolean().optional()
  })
  .strict()
  .transform(({ content, totalElements, totalPages, number, size }): PublicStatusIncidentPage => ({
    content,
    totalElements,
    totalPages,
    number,
    size
  }));

export class PublicStatusContractError extends Error {
  constructor() {
    super('Public status response is invalid');
    this.name = 'PublicStatusContractError';
  }
}

export const parsePublicStatusOrg = (value: unknown) => parse(publicStatusOrgWireSchema, value);
export const parsePublicStatusComponents = (value: unknown) => parse(z.array(publicStatusComponentWireSchema), value);
export const parsePublicStatusIncidents = (value: unknown) => parse(publicStatusIncidentPageSchema, value);

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new PublicStatusContractError();
  return result.data;
}

// Persisted backend byte codes are a compatibility boundary; future values must remain unknown evidence.
function publicOrgState(value: number): PublicStatusOrgState {
  if (value === 0) return 'healthy';
  if (value === 1) return 'degraded';
  if (value === 2) return 'incident';
  return 'unknown';
}

function publicComponentState(value: number): PublicStatusComponentState {
  if (value === 0) return 'healthy';
  if (value === 1) return 'incident';
  return 'unknown';
}

function publicIncidentState(value: number): PublicStatusIncidentState {
  if (value === 0) return 'investigating';
  if (value === 1) return 'identified';
  if (value === 2) return 'monitoring';
  if (value === 3) return 'resolved';
  return 'unknown';
}
