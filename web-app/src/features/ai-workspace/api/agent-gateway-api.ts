/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '@/core/http/api-message';
import { apiStreamFetch } from '@/core/http/http-client';

import type {
  AgentChatRequest,
  AgentGatewayEvent,
  AgentProviderConfigurationView,
  AgentProviderInput,
  AgentProviderOption,
  AgentSession,
  AgentTranscriptMessage
} from '../model/agent-workspace-contract';
import {
  agentGatewayEventSchema,
  agentProviderConfigurationViewSchema,
  agentProviderOptionSchema,
  agentSessionSchema,
  agentTranscriptEntrySchema,
  springPageSchema,
  transcriptPayloadSchema
} from './agent-gateway-schema';

const paths = {
  sessions: '/api/agent/sessions',
  transcript: (sessionUid: string) => `/api/agent/sessions/${encodeURIComponent(sessionUid)}/transcript`,
  stream: '/api/agent/webui/chat/stream',
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
    readonly status?: number
  ) {
    super('Agent Gateway request failed');
    this.name = 'AgentGatewayRequestError';
  }
}

export async function listAgentSessions(signal?: AbortSignal): Promise<AgentSession[]> {
  const value = await apiMessageGet(`${paths.sessions}?pageIndex=0&pageSize=50`, signal ? { signal } : {});
  return parse(springPageSchema(agentSessionSchema), value).content;
}

export async function listAgentTranscript(sessionUid: string, signal?: AbortSignal): Promise<AgentTranscriptMessage[]> {
  const value = await apiMessageGet(
    `${paths.transcript(sessionUid)}?pageIndex=0&pageSize=200`,
    signal ? { signal } : {}
  );
  return parse(springPageSchema(agentTranscriptEntrySchema), value).content.map(entry => {
    let payload: unknown;
    try {
      payload = JSON.parse(entry.payloadJson);
    } catch {
      throw new AgentGatewayRequestError('contract');
    }
    const message = parse(transcriptPayloadSchema, payload);
    return {
      id: entry.id,
      sequence: entry.sessionSequence,
      role: message.role,
      text: message.content
        .filter(block => block.type === 'text' && block.text)
        .map(block => block.text)
        .join('\n'),
      ...(message.toolName ? { toolName: message.toolName } : {}),
      ...(message.errorMessage ? { errorMessage: message.errorMessage } : {}),
      createdAt: entry.gmtCreate
    };
  });
}

export async function streamAgentChat(
  request: AgentChatRequest,
  onEvent: (event: AgentGatewayEvent) => void,
  options: { signal?: AbortSignal; language?: string } = {}
) {
  const headers = new Headers({ Accept: 'text/event-stream', 'Content-Type': 'application/json' });
  if (options.language) headers.set('Accept-Language', options.language);
  let response: Response;
  try {
    response = await apiStreamFetch(paths.stream, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      cache: 'no-store',
      ...(options.signal ? { signal: options.signal } : {})
    });
  } catch (error) {
    if (isAbort(error)) throw error;
    throw new AgentGatewayRequestError('unavailable');
  }
  if (!response.ok) throw new AgentGatewayRequestError('http', response.status);
  if (!response.headers.get('Content-Type')?.toLowerCase().startsWith('text/event-stream') || !response.body) {
    throw new AgentGatewayRequestError('contract', response.status);
  }
  await readEventStream(response.body, onEvent);
}

export function stopAgentRun(runUid: string) {
  return apiMessagePost(paths.stop(runUid), {});
}

export function decideAgentApproval(approvalId: string, decision: 'approve' | 'reject') {
  return apiMessagePost(paths.approval(approvalId, decision), {});
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

async function readEventStream(stream: ReadableStream<Uint8Array>, onEvent: (event: AgentGatewayEvent) => void) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? '';
      frames.forEach(frame => publishFrame(frame, onEvent));
      if (done) break;
    }
    if (buffer.trim()) publishFrame(buffer, onEvent);
  } catch (error) {
    if (isAbort(error)) throw error;
    if (error instanceof AgentGatewayRequestError) throw error;
    throw new AgentGatewayRequestError('contract');
  } finally {
    reader.releaseLock();
  }
}

function publishFrame(frame: string, onEvent: (event: AgentGatewayEvent) => void) {
  const data = frame
    .split(/\r?\n/)
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).replace(/^ /, ''))
    .join('\n');
  if (!data) return;
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    throw new AgentGatewayRequestError('contract');
  }
  onEvent(parse(agentGatewayEventSchema, value));
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
