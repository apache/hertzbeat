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
