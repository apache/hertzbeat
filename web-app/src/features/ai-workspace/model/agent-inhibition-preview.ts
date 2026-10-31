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

const trimmed = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine(value => value.trim() === value);
const labelSetSchema = z.record(trimmed(64), trimmed(256)).refine(value => {
  const entries = Object.entries(value);
  return (
    entries.length > 0 &&
    entries.length <= 32 &&
    entries.reduce((size, [key, item]) => size + key.length + item.length, 0) <= 1800
  );
});
const inhibitionConfigurationSchema = z.strictObject({
  name: trimmed(100),
  sourceLabels: labelSetSchema,
  targetLabels: labelSetSchema,
  equalLabels: z
    .array(trimmed(64))
    .min(1)
    .max(32)
    .refine(items => new Set(items).size === items.length),
  enable: z.boolean()
});
export type InhibitionConfiguration = z.infer<typeof inhibitionConfigurationSchema>;
export const agentInhibitionPreviewSchema = z.strictObject({
  before: inhibitionConfigurationSchema.nullable().optional(),
  targetId: z
    .string()
    .regex(/^[1-9][0-9]{0,18}$/)
    .nullable(),
  sourceHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable(),
  configuration: inhibitionConfigurationSchema.nullable()
});
export type AgentInhibitionPreview = z.infer<typeof agentInhibitionPreviewSchema>;
export function isInhibitionConfiguration(value: unknown): value is InhibitionConfiguration {
  return inhibitionConfigurationSchema.safeParse(value).success;
}
export function isAgentInhibitionPreview(value: unknown, operation: unknown): value is AgentInhibitionPreview {
  const parsed = agentInhibitionPreviewSchema.safeParse(value);
  if (!parsed.success) return false;
  const preview = parsed.data;
  if (operation === 'CREATE')
    return (
      preview.before == null &&
      preview.targetId === null &&
      preview.sourceHash === null &&
      preview.configuration !== null
    );
  if (!preview.targetId || !preview.sourceHash) return false;
  return operation === 'DELETE'
    ? preview.configuration === null
    : operation === 'UPDATE' && preview.configuration !== null;
}
