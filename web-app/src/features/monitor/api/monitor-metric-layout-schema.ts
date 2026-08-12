/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import type { MonitorMetricLayoutResource } from '../model/monitor-metric-layout-model';

const groupSchema = z.string().regex(/^[A-Za-z0-9_.:-]{1,128}$/);
const itemSchema = z
  .object({
    group: groupSchema,
    x: z.number().int().min(0).max(11),
    y: z.number().int().min(0).max(999),
    w: z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(12)]),
    h: z.number().int().min(4).max(24),
    collapsed: z.boolean(),
    order: z.number().int().min(0).max(127)
  })
  .strict()
  .refine(item => item.x + item.w <= 12, 'Item exceeds canonical columns')
  .refine(item => item.collapsed || item.h >= 8, 'Expanded item is too short');

const layoutSchema = z
  .object({
    application: z.string().regex(/^[a-z0-9_.:-]{1,128}$/),
    revision: z.string().min(1).max(64),
    schemaVersion: z.literal(1),
    mode: z.enum(['auto', 'custom']),
    columns: z.literal(12),
    items: z.array(itemSchema).max(128),
    historyDock: z.object({ collapsed: z.boolean(), height: z.number().int().min(8).max(20) }).strict()
  })
  .strict()
  .superRefine((layout, context) => {
    requireUnique(
      layout.items.map(item => item.group),
      'group',
      context
    );
    requireUnique(
      layout.items.map(item => item.order),
      'order',
      context
    );
    for (let index = 0; index < layout.items.length; index += 1) {
      for (let candidate = index + 1; candidate < layout.items.length; candidate += 1) {
        if (overlaps(layout.items[index]!, layout.items[candidate]!)) {
          context.addIssue({ code: 'custom', message: 'Layout items overlap', path: ['items', candidate] });
        }
      }
    }
  });

export class MonitorMetricLayoutContractError extends Error {
  constructor(options?: ErrorOptions) {
    super('Monitor metric layout response is invalid', options);
    this.name = 'MonitorMetricLayoutContractError';
  }
}

export function parseMonitorMetricLayout(value: unknown): MonitorMetricLayoutResource | null {
  if (value === null) return null;
  const result = layoutSchema.safeParse(value);
  if (!result.success) throw new MonitorMetricLayoutContractError({ cause: result.error });
  return result.data;
}

function requireUnique(values: Array<string | number>, field: string, context: z.RefinementCtx) {
  if (new Set(values).size !== values.length) {
    context.addIssue({ code: 'custom', message: `Duplicate layout ${field}`, path: ['items'] });
  }
}

function overlaps(first: z.infer<typeof itemSchema>, second: z.infer<typeof itemSchema>) {
  return (
    first.x < second.x + second.w &&
    first.x + first.w > second.x &&
    first.y < second.y + second.h &&
    first.y + first.h > second.y
  );
}
