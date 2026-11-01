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

import { apiStreamFetch } from '@/core/http/http-client';
import type { AgentChatRequest, AgentGatewayEvent } from '../model/agent-workspace-contract';
import { agentGatewayEventTypes } from '../model/agent-workspace-contract';
import { agentGatewayEventSchema, agentSourceTargetSchema } from './agent-gateway-schema';
import { projectAgentSourceTarget } from './agent-source-target-projection';
import { readAgentStreamChunk } from './agent-stream-deadline';
import { AgentGatewayRequestError, parse, isAbort } from './agent-gateway-error';
import { createStreamTrace, headerFailureCode, type StreamTrace } from './agent-stream-trace';
type StreamOptions = { signal?: AbortSignal; language?: string };

export async function streamAgentChat(
  request: AgentChatRequest,
  onEvent: (event: AgentGatewayEvent) => void,
  options: StreamOptions = {}
) {
  const trace = createStreamTrace();
  const response = await openAgentStream(request, options, trace);
  await readTracedStream(response, onEvent, trace, options.signal);
}

async function openAgentStream(request: AgentChatRequest, options: StreamOptions, trace: StreamTrace) {
  const headers = new Headers({
    Accept: 'text/event-stream',
    'Content-Type': 'application/json',
    'X-HertzBeat-Agent-Request-Id': trace.requestId
  });
  const language = request.preferredLanguage ?? options.language;
  if (language) headers.set('Accept-Language', language);
  let response: Response;
  try {
    response = await apiStreamFetch(
      '/api/agent/webui/chat/stream',
      {
        method: 'POST',
        headers,
        body: JSON.stringify(wireChatRequest(request)),
        cache: 'no-store',
        ...(options.signal ? { signal: options.signal } : {})
      },
      trace.observe
    );
  } catch (error) {
    if (isAbort(error)) {
      trace.event('caller_cancelled');
      throw error;
    }
    throw new AgentGatewayRequestError(
      'unavailable',
      undefined,
      trace.failure(headerFailureCode(error, trace.phase()))
    );
  }
  if (!response.ok)
    throw new AgentGatewayRequestError('http', response.status, trace.failure('HTTP_REJECTED', response.status));
  if (!response.headers.get('Content-Type')?.toLowerCase().startsWith('text/event-stream') || !response.body)
    throw new AgentGatewayRequestError('contract', response.status, trace.failure('STREAM_CONTRACT', response.status));
  return response;
}

async function readTracedStream(
  response: Response,
  onEvent: (event: AgentGatewayEvent) => void,
  trace: StreamTrace,
  signal?: AbortSignal
) {
  let first = true;
  try {
    await readEventStream(
      response.body!,
      event => {
        if (first) {
          first = false;
          trace.event('first_event');
        }
        onEvent(event);
      },
      signal
    );
    trace.event('stream_closed');
  } catch (error) {
    if (isAbort(error)) {
      trace.event('caller_cancelled');
      throw error;
    }
    throw new AgentGatewayRequestError(
      'contract',
      response.status,
      trace.failure('STREAM_READ_FAILED', response.status)
    );
  }
}

function wireChatRequest(request: AgentChatRequest) {
  const target = request.target ? sourceTarget(request.target) : undefined;
  return {
    conversationId: request.conversationId,
    messageId: request.messageId,
    message: request.message,
    ...(target ? { target } : {}),
    attachments: request.attachments
  };
}

function sourceTarget(target: NonNullable<AgentChatRequest['target']>) {
  return parse(agentSourceTargetSchema, projectAgentSourceTarget(target));
}

export async function readEventStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: AgentGatewayEvent) => void,
  signal: AbortSignal = new AbortController().signal
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const cancel = () => {
    void reader.cancel().catch(() => undefined);
  };
  let buffer = '';
  try {
    signal.throwIfAborted();
    signal.addEventListener('abort', cancel, { once: true });
    for (;;) {
      const { done, value } = await readAgentStreamChunk(reader);
      signal.throwIfAborted();
      buffer += decoder.decode(value, { stream: !done });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        signal.throwIfAborted();
        if (publishFrame(frame, onEvent)) return;
      }
      if (done) break;
    }
    if (buffer.trim()) publishFrame(buffer, onEvent);
  } catch (error) {
    if (isAbort(error)) throw error;
    if (error instanceof AgentGatewayRequestError) throw error;
    throw new AgentGatewayRequestError('contract');
  } finally {
    signal.removeEventListener('abort', cancel);
    cancel();
    reader.releaseLock();
  }
}

function publishFrame(frame: string, onEvent: (event: AgentGatewayEvent) => void): boolean {
  const data = frame
    .split(/\r?\n/)
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).replace(/^ /, ''))
    .join('\n');
  if (!data) return false;
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    throw new AgentGatewayRequestError('contract');
  }
  const event = parse(agentGatewayEventSchema, value) as AgentGatewayEvent;
  // Forward compatibility: a newer backend may emit event types this UI does not know; skip them
  // instead of failing the whole stream. Structural violations above still surface as contract errors.
  if (!agentGatewayEventTypes.includes(event.type)) return false;
  onEvent(event);
  return event.type === 'RUN_COMPLETED';
}
