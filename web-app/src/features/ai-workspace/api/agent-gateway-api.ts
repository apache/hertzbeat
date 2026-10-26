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

import { AgentGatewayRequestError, parse, isAbort } from './agent-gateway-error';
export { streamAgentChat, readEventStream } from './agent-chat-stream';
import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '@/core/http/api-message';
import type { AgentTransportFailure } from '../model/agent-transport-diagnostic';

import type {
  AgentProviderConfigurationView,
  AgentProviderInput,
  AgentProviderOption,
  AgentRunSnapshot,
  AgentSession
} from '../model/agent-workspace-contract';
import {
  agentPendingApprovalViewSchema,
  agentProviderConfigurationViewSchema,
  agentProviderOptionSchema,
  agentRunSnapshotSchema,
  agentSessionSchema,
  springPageSchema
} from './agent-gateway-schema';

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

export async function listAgentSessions(signal?: AbortSignal): Promise<AgentSession[]> {
  const value = await apiMessageGet(`${paths.sessions}?pageIndex=0&pageSize=50`, signal ? { signal } : {});
  return parse(springPageSchema(agentSessionSchema), value).content;
}

export { listAgentTranscriptPage } from './agent-transcript-api';

export function agentGatewayFailureDetails(error: unknown): AgentTransportFailure | undefined {
  return error instanceof AgentGatewayRequestError ? error.transportFailure : undefined;
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
