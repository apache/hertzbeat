/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';

export const dashboardPanelIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/u);
const itemSchema = z
  .object({
    x: z.number().int().min(0).max(23),
    y: z.number().int().min(0).max(1000),
    width: z.number().int().min(1).max(24),
    height: z.number().int().min(1).max(100),
    content: z.object({ $ref: z.string().regex(/^#\/spec\/panels\/[A-Za-z0-9_-]{1,128}$/u) }).strict()
  })
  .strict()
  .refine(item => item.x + item.width <= 24);

export const dashboardLayoutSchema = z
  .object({
    kind: z.literal('Grid'),
    spec: z.object({ items: z.array(itemSchema).max(24) }).strict()
  })
  .strict();

export function validDashboardLayout(layout: z.infer<typeof dashboardLayoutSchema>, panelIds: string[]): boolean {
  const items = layout.spec.items;
  const refs = items.map(item => item.content.$ref.slice('#/spec/panels/'.length));
  if (refs.length !== panelIds.length || new Set(refs).size !== refs.length) return false;
  if (!refs.every(ref => panelIds.includes(ref))) return false;
  return items.every((item, index) =>
    items
      .slice(index + 1)
      .every(
        other =>
          item.x + item.width <= other.x ||
          other.x + other.width <= item.x ||
          item.y + item.height <= other.y ||
          other.y + other.height <= item.y
      )
  );
}
