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

import { apiMessageGet } from '@/core/http/api-message';

import type { AgentMessagePart } from '../model/agent-message-parts';
import { AGENT_TRANSCRIPT_PAGE_SIZE, type AgentTranscriptPage } from '../model/agent-transcript-pagination';
import { agentTranscriptEntrySchema, springPageSchema, transcriptPayloadSchema } from './agent-gateway-schema';

const agentTranscriptPath = (sessionUid: string) => `/api/agent/sessions/${encodeURIComponent(sessionUid)}/transcript`;

export async function listAgentTranscriptPage(
  sessionUid: string,
  signal?: AbortSignal,
  pageIndex?: number
): Promise<AgentTranscriptPage> {
  const first = await fetchPage(sessionUid, pageIndex ?? 0, signal);
  // The gateway orders entries ascending. Jump to the last page without reading the entire session.
  const page =
    pageIndex === undefined && first.totalPages > 1 ? await fetchPage(sessionUid, first.totalPages - 1, signal) : first;
  return {
    pageIndex: page.number,
    items: page.content.filter(entry => entry.messageRole !== 'taskCheckpoint').map(mapEntry)
  };
}

async function fetchPage(sessionUid: string, pageIndex: number, signal?: AbortSignal) {
  if (!Number.isSafeInteger(pageIndex) || pageIndex < 0) throw new Error('Invalid transcript page');
  const value = await apiMessageGet(
    `${agentTranscriptPath(sessionUid)}?pageIndex=${pageIndex}&pageSize=${AGENT_TRANSCRIPT_PAGE_SIZE}`,
    signal ? { signal } : {}
  );
  const page = springPageSchema(agentTranscriptEntrySchema).parse(value);
  if (page.number !== pageIndex || page.content.length > AGENT_TRANSCRIPT_PAGE_SIZE) {
    throw new Error('Invalid transcript pagination');
  }
  return page;
}

function mapEntry(entry: ReturnType<typeof agentTranscriptEntrySchema.parse>) {
  let payload: unknown;
  try {
    payload = JSON.parse(entry.payloadJson);
  } catch {
    throw new Error('Invalid agent transcript payload');
  }
  const message = transcriptPayloadSchema.parse(payload);
  const toolCalls = message.content.flatMap((block, index) =>
    block.type === 'toolCall' && block.name
      ? [{ toolCallId: block.id || `transcript:${entry.id}:call:${index}`, toolName: block.name }]
      : []
  );
  return {
    id: entry.id,
    sequence: entry.sessionSequence,
    ...(message.recordedRunUid ? { recordedRunUid: message.recordedRunUid } : {}),
    role: message.role,
    text: message.content
      .filter(block => block.type === 'text' && block.text)
      .map(block => block.text)
      .join('\n'),
    ...(toolCalls.length ? { toolCalls } : {}),
    ...(message.content.length > 1 ? { parts: publicParts(message.content, entry.id) } : {}),
    ...(message.toolCallId ? { toolCallId: message.toolCallId } : {}),
    ...(message.toolName ? { toolName: message.toolName } : {}),
    ...(message.errorMessage ? { errorMessage: message.errorMessage } : {}),
    ...(message.toolStatus ? { toolStatus: message.toolStatus } : {}),
    ...(message.toolElapsedMs != null ? { toolElapsedMs: message.toolElapsedMs } : {}),
    createdAt: entry.gmtCreate
  };
}

function publicParts(content: ReturnType<typeof transcriptPayloadSchema.parse>['content'], entryId: number) {
  return content.flatMap<AgentMessagePart>((block, index) => {
    if (block.type === 'text' && block.text) return [{ type: 'text', text: block.text }];
    if (block.type === 'toolCall' && block.name) {
      return [{ type: 'toolCall', name: block.name, id: block.id || `transcript:${entryId}:call:${index}` }];
    }
    return [];
  });
}
