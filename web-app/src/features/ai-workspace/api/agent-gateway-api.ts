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

import { readAgentStreamChunk } from './agent-stream-deadline';
import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '@/core/http/api-message';
import { apiStreamFetch, type StreamHeaderPhase } from '@/core/http/http-client';
import type { AgentTransportFailure } from '../model/agent-transport-diagnostic';

import type {
  AgentChatRequest,
  AgentGatewayEvent,
  AgentProviderConfigurationView,
  AgentProviderInput,
  AgentProviderOption,
  AgentRunSnapshot,
  AgentSession
} from '../model/agent-workspace-contract';
import {
  agentGatewayEventSchema,
  agentPendingApprovalViewSchema,
  agentSourceTargetSchema,
  agentProviderConfigurationViewSchema,
  agentProviderOptionSchema,
  agentRunSnapshotSchema,
  agentSessionSchema,
  springPageSchema
} from './agent-gateway-schema';
import { projectAgentSourceTarget } from './agent-source-target-projection';

const paths = {
  sessions: '/api/agent/sessions',
  latestRun: (sessionUid: string) => `/api/agent/sessions/${encodeURIComponent(sessionUid)}/latest-run`,
  stream: '/api/agent/webui/chat/stream',
  run: (runUid: string) => `/api/agent/runs/${encodeURIComponent(runUid)}`,
  stop: (runUid: string) => `/api/agent/runs/${encodeURIComponent(runUid)}/stop`,
  approval: (approvalId: string, decision: 'approve' | 'reject') =>
    `/api/agent/approvals/${encodeURIComponent(approvalId)}/${decision}`,
  interaction: (interactionId: string) => `/api/agent/interactions/${encodeURIComponent(interactionId)}/submit`,
  providerOptions: '/api/agent/model-providers/options',
  providers: '/api/agent/model-providers/configurations',
  provider: (providerUid: string) => `/api/agent/model-providers/configurations/${encodeURIComponent(providerUid)}`,
  activeProvider: (providerUid: string) => `/api/agent/model-providers/active/${encodeURIComponent(providerUid)}`,
  activeDefault: '/api/agent/model-providers/active'
};

class AgentGatewayRequestError extends Error {
  constructor(
    readonly kind: 'unavailable' | 'http' | 'contract',
    readonly status?: number,
    readonly transportFailure?: AgentTransportFailure
  ) {
    super('Agent Gateway request failed');
    this.name = 'AgentGatewayRequestError';
  }
}

export async function listAgentSessions(signal?: AbortSignal): Promise<AgentSession[]> {
  const value = await apiMessageGet(`${paths.sessions}?pageIndex=0&pageSize=50`, signal ? { signal } : {});
  return parse(springPageSchema(agentSessionSchema), value).content;
}

export { listAgentTranscriptPage } from './agent-transcript-api';

export function agentGatewayFailureDetails(error: unknown): AgentTransportFailure | undefined {
  return error instanceof AgentGatewayRequestError ? error.transportFailure : undefined;
}

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

function createStreamTrace() {
  const requestId = crypto.randomUUID();
  const began = Date.now();
  let phase: StreamHeaderPhase = 'queued';
  const event = (stage: string, status?: number) => {
    const detail = {
      requestId,
      stage,
      elapsedMs: Math.max(0, Date.now() - began),
      ...(status ? { httpStatus: status } : {})
    };
    try {
      console.info('HB_AGENT_TRANSPORT', JSON.stringify(detail));
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('hertzbeat:agent-transport', { detail }));
    } catch {
      /* Diagnostics cannot affect transport. */
    }
  };
  return {
    requestId,
    event,
    phase: () => phase,
    observe: (next: StreamHeaderPhase) => {
      phase = next;
      event(next);
    },
    failure: (code: AgentTransportFailure['code'], status?: number): AgentTransportFailure => {
      event(code, status);
      return { requestId, code, ...(status ? { httpStatus: status } : {}) };
    }
  };
}
type StreamTrace = ReturnType<typeof createStreamTrace>;

function headerFailureCode(error: unknown, phase: StreamHeaderPhase): AgentTransportFailure['code'] {
  const name = error && typeof error === 'object' && 'name' in error ? error.name : undefined;
  if (name === 'TimeoutError') return phase === 'queued' ? 'QUEUE_TIMEOUT' : 'HEADER_TIMEOUT';
  return phase === 'queued' ? 'REQUEST_PREPARATION_FAILED' : 'TRANSPORT_FAILURE';
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
      paths.stream,
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

export async function getAgentRun(runUid: string, signal?: AbortSignal): Promise<AgentRunSnapshot> {
  return recoverApprovals(
    parse(agentRunSnapshotSchema, await apiMessageGet(paths.run(runUid), signal ? { signal } : {})),
    signal
  );
}

export async function getLatestAgentRun(sessionUid: string, signal?: AbortSignal): Promise<AgentRunSnapshot | null> {
  const snapshot = parse(
    agentRunSnapshotSchema.nullable(),
    await apiMessageGet(paths.latestRun(sessionUid), signal ? { signal } : {})
  );
  return snapshot ? recoverApprovals(snapshot, signal) : null;
}

async function recoverApprovals(snapshot: AgentRunSnapshot, signal?: AbortSignal): Promise<AgentRunSnapshot> {
  try {
    const view = parse(
      agentPendingApprovalViewSchema,
      await apiMessageGet(`${paths.run(snapshot.runUid)}/pending-approvals`, signal ? { signal } : {})
    );
    if (view.runUid !== snapshot.runUid || view.sessionUid !== snapshot.sessionUid)
      throw new AgentGatewayRequestError('contract');
    return {
      ...snapshot,
      recoveredApprovals: view.approvals,
      approvalRecoveryUnavailable: view.truncated
    };
  } catch (error) {
    if (isAbort(error)) throw error;
    return { ...snapshot, approvalRecoveryUnavailable: true };
  }
}

export function stopAgentRun(runUid: string) {
  return apiMessagePost(paths.stop(runUid), {});
}

export async function decideAgentApproval(
  approvalId: string,
  decision: 'approve' | 'reject',
  collectionPlanHash?: string
) {
  const response: unknown = await apiMessagePost(
    paths.approval(approvalId, decision),
    collectionPlanHash ? { collectionPlanHash } : {}
  );
  if (
    response === null ||
    typeof response !== 'object' ||
    !('body' in response) ||
    response.body === null ||
    typeof response.body !== 'object' ||
    !('status' in response.body) ||
    response.body.status !== 'completed'
  )
    throw new Error('Approval response was not accepted');
  return response;
}

export function submitAgentInteraction(interactionId: string, values: Record<string, unknown>) {
  return apiMessagePost(paths.interaction(interactionId), { values });
}

export async function listAgentProviderOptions(): Promise<AgentProviderOption[]> {
  return parse(agentProviderOptionSchema.array(), await apiMessageGet(paths.providerOptions));
}

export async function listAgentProviderConfigurations(): Promise<AgentProviderConfigurationView> {
  return parse(agentProviderConfigurationViewSchema, await apiMessageGet(paths.providers));
}

export async function createAgentProvider(input: AgentProviderInput): Promise<AgentProviderConfigurationView> {
  return parse(agentProviderConfigurationViewSchema, await apiMessagePost(paths.providers, input));
}

export async function updateAgentProvider(
  providerUid: string,
  input: AgentProviderInput
): Promise<AgentProviderConfigurationView> {
  return parse(agentProviderConfigurationViewSchema, await apiMessagePut(paths.provider(providerUid), input));
}

export async function deleteAgentProvider(providerUid: string): Promise<AgentProviderConfigurationView> {
  return parse(agentProviderConfigurationViewSchema, await apiMessageDelete(paths.provider(providerUid)));
}

export async function activateAgentProvider(providerUid: string): Promise<AgentProviderConfigurationView> {
  return parse(agentProviderConfigurationViewSchema, await apiMessagePut(paths.activeProvider(providerUid), {}));
}

export async function activateDefaultAgentProvider(): Promise<AgentProviderConfigurationView> {
  return parse(agentProviderConfigurationViewSchema, await apiMessageDelete(paths.activeDefault));
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
  const event = parse(agentGatewayEventSchema, value);
  onEvent(event);
  return event.type === 'RUN_COMPLETED';
}

function parse<T>(schema: { parse: (value: unknown) => T }, value: unknown): T {
  try {
    return schema.parse(value);
  } catch {
    throw new AgentGatewayRequestError('contract');
  }
}

function isAbort(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'name' in error && error.name === 'AbortError');
}
