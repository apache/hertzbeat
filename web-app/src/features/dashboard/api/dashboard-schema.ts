/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import { AlertSummaryContractError, parseAlertSummaryWire } from '@/shared/alert-summary/alert-summary-contract';
import { DashboardContractError, type DashboardAlertSummary, type DashboardSummary } from '../model/dashboard-model';

const countSchema = z
  .number()
  .refine(Number.isSafeInteger, 'Expected a safe integer')
  .refine(value => value >= 0, 'Expected a non-negative integer');
const nonemptyTextSchema = z
  .string()
  .refine(value => Boolean(value.trim()), 'Expected nonempty text')
  .transform(value => value.trim());

// Dashboard summaries intentionally use Zod's default strip behavior. The
// backend may add counters, but this view exposes only its canonical evidence.
const appCountSchema = z.object({
  app: nonemptyTextSchema,
  category: nonemptyTextSchema,
  size: countSchema,
  availableSize: countSchema,
  unAvailableSize: countSchema,
  unManageSize: countSchema
});

const dashboardSummarySchema = z.object({
  // [] is authoritative empty data; null means the summary source is missing.
  // The controller renders those states differently and must not coerce either.
  apps: z.array(appCountSchema).nullable()
});

export function parseDashboardSummary(value: unknown): DashboardSummary {
  return parseSchema(dashboardSummarySchema, value, 'Dashboard summary');
}

export function parseAlertSummary(value: unknown): DashboardAlertSummary {
  try {
    const summary = parseAlertSummaryWire(value);
    return {
      total: summary.total,
      dealNum: summary.dealNum,
      rate: summary.rate,
      priorityWarningNum: summary.priorityWarningNum,
      priorityCriticalNum: summary.priorityCriticalNum,
      priorityEmergencyNum: summary.priorityEmergencyNum
    };
  } catch (error) {
    if (error instanceof AlertSummaryContractError) {
      throw new DashboardContractError(error.message, { cause: error });
    }
    throw error;
  }
}

function parseSchema<T extends z.ZodType>(schema: T, value: unknown, label: string): z.output<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new DashboardContractError(`${label} did not match the response contract`, { cause: result.error });
}
