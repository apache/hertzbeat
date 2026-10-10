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

import type {
  AgentProviderConfigurationView,
  AgentProviderInput,
  AgentProviderOption,
  AgentSession,
  AgentTargetRef,
  AgentTranscriptMessage
} from './agent-workspace-contract';
import type { AgentToolActivity, AgentWorkspaceRunState } from './agent-workspace-reducer';

type AgentLoadable<T> = { status: 'loading' | 'ready' | 'error'; items: T[] };
export type AgentDraftMessage = { id: string; role: 'user'; text: string };

export function withTranscriptTools(run: AgentWorkspaceRunState, transcript: AgentWorkspaceViewModel['transcript']) {
  const tools = new Map<string, AgentToolActivity>();
  for (const message of transcript.status === 'loading' ? [] : transcript.items) {
    for (const call of message.toolCalls ?? []) tools.set(call.toolCallId, { ...call, status: 'UNKNOWN' });
    if (message.role === 'toolResult' && message.toolName) {
      const toolCallId = message.toolCallId ?? `transcript:${message.id}:result`;
      tools.set(toolCallId, {
        toolCallId,
        toolName: message.toolName,
        status: 'UNKNOWN',
        ...(message.errorMessage ? { errorMessage: message.errorMessage } : {})
      });
    }
  }
  for (const tool of run.tools) tools.set(tool.toolCallId, tool);
  return { ...run, tools: [...tools.values()] };
}

export type AgentWorkspaceViewModel = {
  sessions: AgentLoadable<AgentSession>;
  selectedSessionUid?: string;
  transcript: AgentLoadable<AgentTranscriptMessage>;
  draftMessages: AgentDraftMessage[];
  run: AgentWorkspaceRunState;
  target?: AgentTargetRef;
  invalidTarget: boolean;
  composer: string;
  streaming: boolean;
  stopping: boolean;
  failure?: 'unavailable';
  actions: {
    selectSession: (sessionUid: string) => Promise<void>;
    newInvestigation: () => void;
    setComposer: (value: string) => void;
    send: () => Promise<void>;
    stop: () => Promise<void>;
    retry: () => Promise<void>;
    recover: () => Promise<void>;
    decideApproval: (approvalId: string, decision: 'approve' | 'reject') => Promise<void>;
    submitInteraction: (interactionId: string, values: Record<string, unknown>) => Promise<void>;
  };
};

export type AgentProviderViewModel = {
  options: AgentProviderOption[];
  view?: AgentProviderConfigurationView;
  phase: 'loading' | 'ready' | 'saving' | 'error';
  actions: {
    reload: () => Promise<void>;
    create: (input: AgentProviderInput) => Promise<boolean>;
    update: (providerUid: string, input: AgentProviderInput) => Promise<boolean>;
    delete: (providerUid: string) => Promise<void>;
    activate: (providerUid: string) => Promise<void>;
    activateDefault: () => Promise<void>;
  };
};
