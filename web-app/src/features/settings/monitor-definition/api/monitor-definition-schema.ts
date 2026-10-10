/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { z } from 'zod';

import {
  MONITOR_DEFINITION_APP_MAX_LENGTH,
  type MonitorDefinitionCatalog,
  type MonitorDefinitionDelete,
  type MonitorDefinitionDetail,
  type MonitorDefinitionValidation,
  type MonitorDefinitionValidationRequest
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
    app: safeText.max(MONITOR_DEFINITION_APP_MAX_LENGTH),
    label: safeText,
    origin,
    editable: z.boolean(),
    deletable: z.boolean(),
    hidden: z.boolean(),
    revision
  })
  .strict();
const catalog = z.object({ schemaVersion: z.literal(1), items: z.array(item) }).strict();
const detail = item.extend({ schemaVersion: z.literal(1), definition }).strict();
const validationRequest = z
  .object({
    operation: z.enum(['create', 'update']),
    expectedApp: safeText.max(MONITOR_DEFINITION_APP_MAX_LENGTH).nullable(),
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
  .object({
    schemaVersion: z.literal(1),
    valid: z.literal(true),
    app: safeText.max(MONITOR_DEFINITION_APP_MAX_LENGTH),
    origin
  })
  .strict();
const writeRequest = z.object({ definition }).strict();
const deleted = z
  .object({
    schemaVersion: z.literal(1),
    app: safeText.max(MONITOR_DEFINITION_APP_MAX_LENGTH),
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
