/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

const systemConfigValueSchema = z.object({
  locale: z.string(),
  timeZoneId: z.string(),
  theme: z.string()
}).strict();

const systemConfigSchema = systemConfigValueSchema.nullable();

const timezoneOptionSchema = z.object({
  zoneId: z.string(),
  offset: z.string(),
  displayName: z.string()
}).strict();

const timezonesSchema = z.array(timezoneOptionSchema);
const mutationResultSchema = z.string();

export type SystemConfigValue = z.infer<typeof systemConfigValueSchema>;
export type TimezoneOption = z.infer<typeof timezoneOptionSchema>;

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

export function parseSystemConfigMutationResult(value: unknown): string {
  return parse(mutationResultSchema, value);
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new SystemConfigContractError();
  return result.data;
}
