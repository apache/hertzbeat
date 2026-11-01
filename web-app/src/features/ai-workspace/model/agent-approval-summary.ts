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
import { agentCollectionPreviewSchema } from './agent-collection-preview';
import { agentPersonalWorkspacePreviewSchema } from './agent-personal-workspace-preview';
import { agentInhibitionPreviewSchema, isAgentInhibitionPreview } from './agent-inhibition-preview';

const targetSchema = z.strictObject({
  kind: z.enum(['WEBSITE', 'MONITOR', 'RESOURCE']),
  id: z
    .string()
    .regex(/^[1-9][0-9]{0,18}$/)
    .nullable(),
  origin: z
    .string()
    .regex(/^https?:\/\/(?:[A-Za-z0-9.-]+|\[[0-9A-Fa-f:]+\])(?::[0-9]{1,5})?$/)
    .nullable(),
  pathFingerprint: z
    .string()
    .regex(/^[a-f0-9]{16}$/)
    .nullable(),
  keyFingerprint: z
    .string()
    .regex(/^[a-f0-9]{16}$/)
    .nullable(),
  intervals: z.number().int().min(0).max(86400).nullable(),
  timeout: z.number().int().min(0).max(10000).nullable()
});
const changeSchema = z.union([
  z.strictObject({ field: z.enum(['INTERVALS', 'TIMEOUT']), value: z.string().regex(/^[0-9]{1,5}$/) }),
  z.strictObject({ field: z.literal('RETRY_PREFLIGHT'), value: z.string().regex(/^(true|false)$/) })
]);
const approvalSummaryBaseSchema = z.strictObject({
  version: z.literal('approval-summary.v1'),
  operation: z.enum(['CREATE', 'UPDATE', 'DELETE', 'PAUSE', 'RESUME', 'REVIEW']),
  targetCount: z.number().int().min(0).max(262144),
  inputHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable(),
  complete: z.boolean(),
  maskedFields: z
    .array(z.enum(['FREE_TEXT', 'URL_PATH', 'URL_QUERY', 'PARAMETERS', 'UNSUPPORTED', 'BOUND_INPUT_UNAVAILABLE']))
    .max(8),
  targets: z.array(targetSchema).max(100),
  changes: z.array(changeSchema).max(8),
  collection: agentCollectionPreviewSchema.nullable().optional(),
  personal: agentPersonalWorkspacePreviewSchema.nullable().optional(),
  inhibition: agentInhibitionPreviewSchema.nullable().optional()
});
type Summary = z.infer<typeof approvalSummaryBaseSchema>;
function personalOperation(preview: NonNullable<Summary['personal']>) {
  if (preview.kind === 'FAVORITE') return 'UPDATE';
  if (preview.request === null) return 'DELETE';
  return preview.expectedRevision === 'missing' ? 'CREATE' : 'UPDATE';
}
function validPersonalExtension(value: Summary) {
  if (value.personal == null) return true;
  return (
    value.collection == null &&
    value.inhibition == null &&
    value.targetCount === 1 &&
    value.complete &&
    value.inputHash !== null &&
    value.operation === personalOperation(value.personal)
  );
}
function validInhibitionExtension(value: Summary) {
  if (value.inhibition == null) return true;
  return (
    value.collection == null &&
    value.targetCount === 1 &&
    value.complete &&
    value.inputHash !== null &&
    isAgentInhibitionPreview(value.inhibition, value.operation)
  );
}
const agentApprovalSummarySchema = approvalSummaryBaseSchema.refine(
  value => validPersonalExtension(value) && validInhibitionExtension(value)
);
export type AgentApprovalSummary = z.infer<typeof agentApprovalSummarySchema>;
/** Reject unknown fields and invalid extension bindings before presenting an approval. */
export function isAgentApprovalSummary(value: unknown): value is AgentApprovalSummary {
  return agentApprovalSummarySchema.safeParse(value).success;
}
