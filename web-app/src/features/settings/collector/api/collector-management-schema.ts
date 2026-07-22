/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import {
  availableCollectorIntakeSchema,
  parseCollectorInstrumentationIntake,
  unavailableCollectorIntakeSchema
} from '@/shared/collector';

import { CollectorContractError, immutableCollectorName, type CollectorPage } from '../model/collector-model';
import type { CollectorQuery } from '../model/collector-query-model';

const safeText = z
  .string()
  .min(1)
  .refine(value => value === value.trim());
const nullableText = z.string().nullable();

const collectorInfoSchema = z
  .object({
    id: z.number().int().positive(),
    name: safeText.max(128),
    ip: safeText,
    version: nullableText,
    status: z.union([z.literal(0), z.literal(1)]),
    mode: nullableText,
    creator: nullableText,
    modifier: nullableText,
    gmtCreate: nullableText,
    gmtUpdate: nullableText
  })
  .strict();

const collectorSummarySchema = z
  .object({
    collector: collectorInfoSchema,
    pinMonitorNum: z.number().int().nonnegative(),
    dispatchMonitorNum: z.number().int().nonnegative(),
    runtimeStatus: z.unknown().nullable(),
    runtimeStatusReportedAt: nullableText,
    instrumentationIntake: z.union([availableCollectorIntakeSchema, unavailableCollectorIntakeSchema])
  })
  .strict()
  .superRefine((summary, context) => {
    for (const field of ['runtimeStatus', 'instrumentationIntake'] as const) {
      if (!Object.hasOwn(summary, field)) context.addIssue({ code: 'custom', message: `${field} is required` });
    }
    if (summary.instrumentationIntake?.collectorId !== summary.collector.name) {
      context.addIssue({ code: 'custom', message: 'Collector intake identity does not match' });
    }
  });

const collectorPageSchema = z.object({
  content: z.array(collectorSummarySchema),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  number: z.number().int().nonnegative(),
  size: z.number().int().positive()
});

export function parseCollectorManagementPage(value: unknown, query: CollectorQuery): CollectorPage {
  return parseCollectorPage(value, query, false);
}

export function parseCollectorMutationProofPage(value: unknown, query: CollectorQuery): CollectorPage {
  return parseCollectorPage(value, query, true);
}

function parseCollectorPage(value: unknown, query: CollectorQuery, allowOutOfRangeEmpty: boolean): CollectorPage {
  const parsed = collectorPageSchema.safeParse(value);
  if (!parsed.success) throw new CollectorContractError();
  const page = parsed.data;
  const expectedPages = page.totalElements === 0 ? 0 : Math.ceil(page.totalElements / page.size);
  const expectedMaximumLength = Math.min(page.size, Math.max(0, page.totalElements - page.number * page.size));
  const outOfRange = page.totalPages === 0 ? page.number !== 0 : page.number >= page.totalPages;
  if (
    page.number !== query.pageIndex ||
    page.size !== query.pageSize ||
    page.totalPages !== expectedPages ||
    page.content.length !== expectedMaximumLength ||
    (outOfRange && (!allowOutOfRangeEmpty || page.content.length !== 0))
  ) {
    throw new CollectorContractError();
  }
  return {
    content: page.content.map(summary => ({
      name: summary.collector.name,
      address: summary.collector.ip,
      version: summary.collector.version,
      mode: summary.collector.mode,
      online: summary.collector.status === 0,
      immutable: summary.collector.name === immutableCollectorName,
      pinMonitorNum: summary.pinMonitorNum,
      dispatchMonitorNum: summary.dispatchMonitorNum,
      updatedAt: summary.collector.gmtUpdate,
      runtimeStatusReportedAt: summary.runtimeStatusReportedAt,
      instrumentationIntake: parseCollectorInstrumentationIntake(summary.instrumentationIntake, summary.collector.name)
    })),
    totalElements: page.totalElements,
    totalPages: page.totalPages,
    number: page.number,
    size: page.size
  };
}
