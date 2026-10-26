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

const revisionSchema = z.union([
  z.literal('missing'),
  z.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/)
]);
const layoutItemSchema = z
  .strictObject({
    group: z.string().regex(/^[A-Za-z0-9_.:-]{1,128}$/),
    x: z.number().int().min(0).max(12),
    y: z.number().int().min(0).max(999),
    w: z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(12)]),
    h: z.number().int().min(4).max(24),
    collapsed: z.boolean(),
    order: z.number().int().min(0).max(127)
  })
  .refine(value => value.x + value.w <= 12 && value.h >= (value.collapsed ? 4 : 8));
type LayoutItem = z.infer<typeof layoutItemSchema>;
function overlap(a: LayoutItem, b: LayoutItem) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
const layoutItemsSchema = z
  .array(layoutItemSchema)
  .max(128)
  .refine(items => {
    if (
      new Set(items.map(item => item.group)).size !== items.length ||
      new Set(items.map(item => item.order)).size !== items.length
    )
      return false;
    return items.every((item, index) => items.slice(index + 1).every(other => !overlap(item, other)));
  });
export const personalLayoutRequestSchema = z.strictObject({
  expectedRevision: revisionSchema,
  schemaVersion: z.literal(1),
  mode: z.enum(['auto', 'custom']),
  columns: z.literal(12),
  items: layoutItemsSchema,
  historyDock: z.strictObject({ collapsed: z.boolean(), height: z.number().int().min(8).max(20) })
});
export type PersonalLayoutRequest = z.infer<typeof personalLayoutRequestSchema>;
const personalWorkspaceBaseSchema = z.strictObject({
  kind: z.enum(['FAVORITE', 'LAYOUT']),
  monitorId: z
    .string()
    .regex(/^[1-9][0-9]{0,18}$/)
    .nullable(),
  application: z
    .string()
    .regex(/^[a-z0-9_.:-]{1,128}$/)
    .nullable(),
  metricsName: z
    .string()
    .regex(/^[A-Za-z0-9_.:-]{1,100}$/)
    .nullable(),
  favorite: z.boolean().nullable(),
  expectedRevision: revisionSchema.nullable(),
  request: personalLayoutRequestSchema.nullable()
});
type PersonalPreview = z.infer<typeof personalWorkspaceBaseSchema>;
function validFavorite(value: PersonalPreview) {
  return (
    value.monitorId !== null &&
    value.metricsName !== null &&
    value.favorite !== null &&
    value.application === null &&
    value.expectedRevision === null &&
    value.request === null
  );
}
function validLayout(value: PersonalPreview) {
  if (
    value.monitorId !== null ||
    value.metricsName !== null ||
    value.favorite !== null ||
    value.application === null ||
    value.expectedRevision === null
  )
    return false;
  return value.request === null
    ? value.expectedRevision !== 'missing'
    : value.request.expectedRevision === value.expectedRevision;
}
export const agentPersonalWorkspacePreviewSchema = personalWorkspaceBaseSchema.refine(value =>
  value.kind === 'FAVORITE' ? validFavorite(value) : validLayout(value)
);
export type AgentPersonalWorkspacePreview = z.infer<typeof agentPersonalWorkspacePreviewSchema>;
export function isPersonalLayoutRequest(value: unknown): value is PersonalLayoutRequest {
  return personalLayoutRequestSchema.safeParse(value).success;
}
export function isAgentPersonalWorkspacePreview(value: unknown): value is AgentPersonalWorkspacePreview {
  return agentPersonalWorkspacePreviewSchema.safeParse(value).success;
}
