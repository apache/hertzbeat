/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import {
  DashboardContractError,
  type DashboardAlertSummary,
  type DashboardSummary
} from '../model/dashboard-model';

const countSchema = z.number()
  .refine(Number.isSafeInteger, 'Expected a safe integer')
  .refine(value => value >= 0, 'Expected a non-negative integer');
const nonemptyTextSchema = z.string()
  .refine(value => Boolean(value.trim()), 'Expected nonempty text')
  .transform(value => value.trim());

const appCountSchema = z.object({
  app: nonemptyTextSchema,
  category: nonemptyTextSchema,
  size: countSchema,
  availableSize: countSchema,
  unAvailableSize: countSchema,
  unManageSize: countSchema
});

const dashboardSummarySchema = z.object({
  apps: z.array(appCountSchema).nullable()
});

const dashboardAlertSummarySchema = z.object({
  total: countSchema,
  dealNum: countSchema,
  rate: z.number().finite().nonnegative(),
  priorityWarningNum: countSchema,
  priorityCriticalNum: countSchema,
  priorityEmergencyNum: countSchema
});

export function parseDashboardSummary(value: unknown): DashboardSummary {
  return parseSchema(dashboardSummarySchema, value, 'Dashboard summary');
}

export function parseAlertSummary(value: unknown): DashboardAlertSummary {
  return parseSchema(dashboardAlertSummarySchema, value, 'Dashboard alert summary');
}

function parseSchema<T extends z.ZodType>(schema: T, value: unknown, label: string): z.output<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new DashboardContractError(`${label} did not match the response contract`, { cause: result.error });
}
