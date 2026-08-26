/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import { MonitorContractError } from '../model/monitor-contract';
import type { MonitorInvestigationBinding } from '../model/monitor-investigation-model';
import { nonEmptyStringSchema, positiveIntegerSchema } from './monitor-read-schema-primitives';

const signalSchema = z.enum(['metrics', 'logs', 'traces']);
const optionalIdentitySchema = z
  .string()
  .nullable()
  .transform(value => value?.trim() || undefined);
const bindingSchema = z
  .object({
    monitorId: positiveIntegerSchema,
    entityId: positiveIntegerSchema,
    entityType: z.literal('service'),
    serviceName: nonEmptyStringSchema,
    serviceNamespace: optionalIdentitySchema,
    environment: optionalIdentitySchema,
    signals: z.array(signalSchema)
  })
  .strict()
  .superRefine((binding, context) => {
    if (new Set(binding.signals).size !== binding.signals.length) {
      context.addIssue({ code: 'custom', message: 'Signal identities must be unique' });
    }
  });

export function parseMonitorInvestigationBinding(
  value: unknown,
  requestedMonitorId: number
): MonitorInvestigationBinding | undefined {
  if (value === null || value === undefined) return undefined;
  const result = bindingSchema.safeParse(value);
  if (!result.success || result.data.monitorId !== requestedMonitorId) throw new MonitorContractError();
  return {
    ...result.data,
    serviceName: result.data.serviceName.trim()
  };
}
