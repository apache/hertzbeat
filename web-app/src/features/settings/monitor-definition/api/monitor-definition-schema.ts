/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import type {
  MonitorDefinitionCatalog,
  MonitorDefinitionDelete,
  MonitorDefinitionDetail,
  MonitorDefinitionValidation,
  MonitorDefinitionValidationRequest
} from '../model/monitor-definition-model';

export class MonitorDefinitionContractError extends Error {
  constructor() {
    super('Invalid monitor definition response');
    this.name = 'MonitorDefinitionContractError';
  }
}

const safeText = z
  .string()
  .min(1)
  .max(512)
  .refine(value => value === value.trim() && !Array.from(value).some(character => /\p{Cc}/u.test(character)));
const definition = z.string().min(1);
const revision = z.string().regex(/^[0-9a-f]{64}$/);
const origin = z.enum(['builtin', 'custom', 'override']);
const item = z
  .object({
    app: safeText.max(128),
    label: safeText,
    origin,
    editable: z.boolean(),
    deletable: z.boolean(),
    revision
  })
  .strict();
const catalog = z.object({ schemaVersion: z.literal(1), items: z.array(item) }).strict();
const detail = item.extend({ schemaVersion: z.literal(1), definition }).strict();
const validationRequest = z
  .object({
    operation: z.enum(['create', 'update']),
    expectedApp: safeText.max(128).nullable(),
    definition
  })
  .strict()
  .superRefine((value, context) => {
    if (value.operation === 'create' && value.expectedApp !== null) {
      context.addIssue({ code: 'custom', message: 'Create must not own an expected app' });
    }
    if (value.operation === 'update' && value.expectedApp === null) {
      context.addIssue({ code: 'custom', message: 'Update must own an expected app' });
    }
  });
const validation = z
  .object({ schemaVersion: z.literal(1), valid: z.literal(true), app: safeText.max(128), origin })
  .strict();
const writeRequest = z.object({ definition }).strict();
const deleted = z
  .object({
    schemaVersion: z.literal(1),
    app: safeText.max(128),
    disposition: z.enum(['removed', 'builtin_restored'])
  })
  .strict();

export function parseMonitorDefinitionCatalog(value: unknown): MonitorDefinitionCatalog {
  return parse(catalog, value);
}

export function parseMonitorDefinitionDetail(value: unknown): MonitorDefinitionDetail {
  return parse(detail, value);
}

export function parseMonitorDefinitionValidationRequest(value: unknown): MonitorDefinitionValidationRequest {
  return parse(validationRequest, value);
}

export function parseMonitorDefinitionValidation(value: unknown): MonitorDefinitionValidation {
  return parse(validation, value);
}

export function parseMonitorDefinitionWriteRequest(value: unknown) {
  return parse(writeRequest, value);
}

export function parseMonitorDefinitionDelete(value: unknown): MonitorDefinitionDelete {
  return parse(deleted, value);
}

function parse<T>(schema: z.ZodType<T>, value: unknown) {
  const result = schema.safeParse(value);
  if (!result.success) throw new MonitorDefinitionContractError();
  return result.data;
}
