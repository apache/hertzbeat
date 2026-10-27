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

import { agentEvidenceSchema } from './agent-evidence-schema';
import { isAgentApprovalSummary } from '../model/agent-approval-summary';
import type { AgentApprovalSummary } from '../model/agent-approval-summary';
import { agentGatewayEventTypes } from '../model/agent-workspace-contract';
import { agentRunTargetSchema, agentSourceTargetWireSchema } from './agent-target-schema';
export { agentSourceTargetSchema } from './agent-target-schema';

const publicMessagePartsSchema = z.array(
  z.union([
    z.object({ type: z.literal('text'), text: z.string() }).strip(),
    z.object({ type: z.literal('toolCall'), id: z.string().min(1), name: z.string().min(1) }).strip()
  ])
);

export const agentGatewayEventSchema = z
  .object({
    type: z.enum(agentGatewayEventTypes),
    eventId: z.string().min(1),
    conversationId: z.string().nullable(),
    sessionUid: z.string().nullable(),
    runUid: z.string().nullable(),
    itemId: z.string().nullable(),
    payload: z.record(z.string(), z.unknown()),
    timestamp: z.number().nonnegative()
  })
  .strict()
  .transform(event =>
    event.type === 'MESSAGE_COMPLETED' && event.payload.parts != null
      ? { ...event, messageParts: publicMessagePartsSchema.parse(event.payload.parts) }
      : event
  );

export const agentSessionSchema = z
  .object({
    id: z.number().int().positive(),
    sessionUid: z.string().min(1),
    conversationId: z.string().nullable(),
    status: z.string().min(1),
    title: z.string().nullable(),
    gmtCreate: z.string().nullable(),
    gmtUpdate: z.string().nullable()
  })
  .passthrough();

const agentQueryCoverageSchema = z
  .object({
    toolCallId: z.string(),
    toolName: z.string(),
    state: z.enum(['EMPTY_RESULT', 'PARTIAL_PAGE', 'BOUNDED_RESULTS', 'OBSERVED_ROWS', 'UNKNOWN']),
    unit: z.enum(['rows', 'points', 'groups']),
    start: z.number().int().nonnegative().nullable(),
    end: z.number().int().nonnegative().nullable(),
    offset: z.number().int().nonnegative().nullable(),
    returned: z.number().int().nonnegative().nullable(),
    total: z.number().int().nonnegative().nullable(),
    partial: z.boolean(),
    truncated: z.boolean(),
    scope: z.record(z.string(), z.string())
  })
  .strict();

export const agentExecutionSummarySchema = z
  .object({
    queryCoverage: z.array(agentQueryCoverageSchema).optional(),
    coverageTruncated: z.boolean().optional(),
    stopReason: z.string().nullable().optional(),
    status: z.enum(['UNKNOWN', 'IN_PROGRESS', 'NO_RECORDS', 'PARTIAL', 'RECOVERED', 'NO_FAILED_ATTEMPTS']),
    totalAttempts: z.number().int().nonnegative().nullable(),
    succeededAttempts: z.number().int().nonnegative().nullable(),
    failedAttempts: z.number().int().nonnegative().nullable(),
    recoveredAttempts: z.number().int().nonnegative().nullable(),
    unresolvedAttempts: z.number().int().nonnegative().nullable(),
    unfinishedAttempts: z.number().int().nonnegative().nullable(),
    failures: z.array(
      z
        .object({
          toolCallId: z.string().nullable(),
          toolName: z.string().nullable(),
          status: z.enum(['FAILED', 'DENIED']),
          errorMessage: z.string().nullable(),
          recovery: z.enum(['UNRESOLVED', 'SAME_REQUEST_SUCCEEDED', 'CHANGED_REQUEST_SUCCEEDED_SCOPE_UNVERIFIED']),
          laterSuccessToolCallId: z.string().nullable()
        })
        .strict()
    ),
    truncated: z.boolean()
  })
  .strict();

export const agentPendingApprovalViewSchema = z
  .object({
    runUid: z.string().min(1),
    sessionUid: z.string().min(1),
    truncated: z.boolean(),
    approvals: z
      .array(
        z
          .object({
            approvalId: z.string().min(1),
            toolCallId: z.string().min(1),
            toolName: z.string().min(1),
            status: z.enum([
              'WAITING_APPROVAL',
              'EXPIRED',
              'UNAVAILABLE',
              'APPROVED',
              'REJECTED',
              'PENDING',
              'NOT_REQUIRED'
            ]),
            expiresAt: z.string().nullable(),
            canDecide: z.boolean(),
            summary: z.custom<AgentApprovalSummary>(isAgentApprovalSummary).nullish()
          })
          .strict()
      )
      .max(64)
  })
  .strict();

export const agentRunSnapshotSchema = z
  .object({
    executionSummary: agentExecutionSummarySchema.nullable().optional(),
    evidence: z.array(agentEvidenceSchema).optional(),
    runUid: z.string().min(1),
    sessionUid: z.string().min(1),
    messageId: z.string().min(1),
    status: z.enum(['CREATED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'RECOVERY_REQUIRED']),
    target: agentRunTargetSchema.nullable(),
    result: z.string().nullable(),
    errorMessage: z.string().nullable(),
    replayAvailable: z.boolean(),
    startedAt: z.string().nullable(),
    completedAt: z.string().nullable(),
    retryRequest: z
      .object({
        conversationId: z.string().min(1),
        messageId: z.string().min(1),
        message: z.string().min(1),
        target: agentSourceTargetWireSchema.nullable(),
        attachments: z.array(z.string().min(1)),
        preferredLanguage: z.string().min(1)
      })
      .strict()
      .nullable()
      .default(null)
  })
  .strict();

export const agentTranscriptEntrySchema = z
  .object({
    id: z.number().int().positive(),
    sessionSequence: z.number().int().positive(),
    payloadJson: z.string(),
    messageRole: z.enum(['user', 'assistant', 'toolResult', 'compactionSummary', 'taskCheckpoint']),
    gmtCreate: z.string().nullable()
  })
  .passthrough();

export const transcriptPayloadSchema = z
  .object({
    recordedRunUid: z.string().min(1).nullable().optional(),
    role: z.enum(['user', 'assistant', 'toolResult', 'compactionSummary']),
    content: z.array(
      z
        .object({
          type: z.enum(['text', 'toolCall']),
          text: z.string().nullable().optional(),
          id: z.string().nullable().optional(),
          name: z.string().nullable().optional(),
          input: z.record(z.string(), z.unknown()).optional()
        })
        .passthrough()
    ),
    toolCallId: z.string().nullable().optional(),
    toolName: z.string().nullable().optional(),
    errorMessage: z.string().nullable().optional(),
    toolStatus: z.enum(['RUNNING', 'WAITING_APPROVAL', 'SUCCEEDED', 'FAILED', 'DENIED']).nullable().optional(),
    toolElapsedMs: z.number().int().nonnegative().nullable().optional()
  })
  .passthrough();

export const agentProviderOptionSchema = z
  .object({
    type: z.string().min(1),
    code: z.string().min(1),
    label: z.string().min(1),
    defaultBaseUrl: z.string().nullable().default(null),
    defaultModel: z.string().nullable().default(null),
    requiredFields: z.array(z.string()).default([])
  })
  .strict();

export const agentProviderConfigurationViewSchema = z
  .object({
    activeProviderUid: z.string().nullable(),
    providers: z.array(
      z
        .object({
          uid: z.string().min(1),
          type: z.string().min(1),
          code: z.string().min(1),
          baseUrl: z.string().nullable(),
          model: z.string().nullable(),
          apiKeyConfigured: z.boolean(),
          protocol: z.enum(['chat-completions', 'responses']).optional()
        })
        .strict()
    )
  })
  .strict();

export const springPageSchema = <T extends z.ZodType>(item: T) =>
  z
    .object({
      content: z.array(item),
      totalElements: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
      number: z.number().int().nonnegative(),
      size: z.number().int().nonnegative()
    })
    .passthrough();
