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

import type { SystemConfigValue, TimezoneOption } from '../model/system-config-contract';
import { systemLocales, systemThemes } from '../model/system-config-model';

const systemConfigValueSchema: z.ZodType<SystemConfigValue> = z
  .object({
    locale: z.enum(systemLocales),
    timeZoneId: z.string().trim().min(1),
    theme: z.enum(systemThemes)
  })
  .strict();

const systemConfigSchema = systemConfigValueSchema.nullable();

const timezoneOptionSchema: z.ZodType<TimezoneOption> = z
  .object({
    zoneId: z.string(),
    offset: z.string(),
    displayName: z.string()
  })
  .strict();

const timezonesSchema = z.array(timezoneOptionSchema);
const mutationResultSchema = systemConfigValueSchema;

export class SystemConfigContractError extends Error {
  constructor() {
    super('System configuration response is invalid');
    this.name = 'SystemConfigContractError';
  }
}

export function parseSystemConfig(value: unknown): SystemConfigValue | null {
  return parse(systemConfigSchema, value);
}

export function parseTimezoneOptions(value: unknown): TimezoneOption[] {
  return parse(timezonesSchema, value);
}

export function parseSystemConfigMutationResult(value: unknown): SystemConfigValue {
  return parse(mutationResultSchema, value);
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new SystemConfigContractError();
  return result.data;
}
