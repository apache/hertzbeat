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
import { apiMessageGet } from '@/core/http/api-message';
import { apiStreamFetch } from '@/core/http/http-client';
import type { AgentBatchProgress } from '../model/agent-batch';
import type { AgentGatewayEvent } from '../model/agent-workspace-contract';
import { readEventStream } from './agent-gateway-api';

export const agentBatchPath = (runUid: string) => `/api/agent/runs/${encodeURIComponent(runUid)}/batch`;
export const agentBatchContinuePath = (runUid: string) => `${agentBatchPath(runUid)}/continue`;
export const agentBatchSchema = z
  .object({
    version: z.literal('monitor-batch-progress.v1'),
    batchUid: z.string(),
    planHash: z.string().regex(/^[a-f0-9]{64}$/),
    runUid: z.string(),
    segment: z.number().int().min(0).max(64),
    resumeFromRunUid: z.string(),
    runStatus: z.string(),
    stage: z.enum(['RUNNING', 'WAITING_APPROVAL', 'COMPLETE', 'REVIEW_REQUIRED', 'PAUSED']),
    operation: z.string(),
    total: z.number().int().min(2).max(50),
    verified: z.number().int().min(0),
    pending: z.number().int().min(0),
    reviewRequired: z.number().int().min(0),
    toolCalls: z.number().int().min(0),
    toolBudget: z.number().int().min(0),
    nextAction: z.enum(['NONE', 'CONTINUE', 'RECONCILE']),
    actionReason: z.string().nullable(),
    observedAt: z.number(),
    items: z.array(
      z
        .object({
          id: z.string(),
          name: z.string().nullable(),
          target: z.string().nullable(),
          arguments: z.record(z.string(), z.unknown()),
          status: z.string(),
          monitorId: z.string().nullable(),
          reason: z.string().nullable(),
          toolCallId: z.string().nullable(),
          approvalId: z.string().nullable(),
          approvalTool: z.string().nullable(),
          receiptKind: z.enum(['NATIVE_RECEIPT', 'STATE_READBACK', 'MATCH_ONLY', 'NONE'])
        })
        .strict()
    )
  })
  .strict()
  .superRefine((batch, context) => {
    if (batch.items.length !== batch.total || batch.verified + batch.pending + batch.reviewRequired !== batch.total) {
      context.addIssue({ code: 'custom', message: 'Inconsistent batch progress' });
    }
  });
export async function getAgentBatch(runUid: string, signal?: AbortSignal): Promise<AgentBatchProgress | null> {
  return agentBatchSchema.nullable().parse(await apiMessageGet(agentBatchPath(runUid), signal ? { signal } : {}));
}
export async function streamAgentBatch(
  batch: { runUid: string; planHash: string },
  onEvent: (event: AgentGatewayEvent) => void,
  signal?: AbortSignal,
  language?: string
) {
  const response = await apiStreamFetch(agentBatchContinuePath(batch.runUid), {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      ...(language ? { 'Accept-Language': language } : {})
    },
    body: JSON.stringify({ planHash: batch.planHash }),
    cache: 'no-store',
    ...(signal ? { signal } : {})
  });
  if (!response.ok || !response.body || !response.headers.get('Content-Type')?.startsWith('text/event-stream')) {
    throw new Error('Batch continuation is unavailable');
  }
  await readEventStream(response.body, onEvent, signal);
}
