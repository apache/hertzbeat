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

import { agentToolIsTerminal, agentToolStatus } from './agent-runtime-status';
import type {
  AgentProviderConfigurationView,
  AgentProviderInput,
  AgentProviderOption,
  AgentSession,
  AgentTargetRef,
  AgentTranscriptMessage
} from './agent-workspace-contract';
import type { AgentSessionDeletion } from './agent-session-management';
import type { ProviderConnectionTest } from './agent-provider-test-contract';
import type { AgentToolActivity, AgentWorkspaceRunState } from './agent-workspace-reducer';

type AgentLoadable<T> = { status: 'loading' | 'ready' | 'error'; items: T[] };
export type AgentDraftMessage = { id: string; role: 'user'; text: string };

export function withTranscriptTools(run: AgentWorkspaceRunState, transcript: AgentWorkspaceViewModel['transcript']) {
  const tools = new Map<string, AgentToolActivity>();
  const recordedRuns = new Map<string, string | undefined>();
  for (const message of transcript.status === 'loading' ? [] : transcript.items) {
    for (const call of message.toolCalls ?? []) {
      tools.set(call.toolCallId, {
        ...call,
        recordedRunUid: message.recordedRunUid,
        status: 'UNKNOWN'
      });
      recordedRuns.set(call.toolCallId, message.recordedRunUid);
    }
    if (message.role === 'toolResult' && message.toolName) {
      const toolCallId = message.toolCallId ?? `transcript:${message.id}:result`;
      recordedRuns.set(toolCallId, message.recordedRunUid);
      tools.set(toolCallId, {
        toolCallId,
        recordedRunUid: message.recordedRunUid,
        toolName: message.toolName,
        status: agentToolStatus(message.toolStatus ?? 'UNKNOWN', message.errorMessage),
        ...(message.toolElapsedMs != null ? { elapsedMs: message.toolElapsedMs } : {}),
        ...(message.errorMessage ? { errorMessage: message.errorMessage } : {})
      });
    }
  }
  overlayLiveTools(tools, recordedRuns, run);
  return { ...run, tools: [...tools.values()] };
}

function overlayLiveTools(
  tools: Map<string, AgentToolActivity>,
  recordedRuns: Map<string, string | undefined>,
  run: AgentWorkspaceRunState
) {
  for (const tool of run.tools) {
    const persisted = tools.get(tool.toolCallId);
    const sameRun = run.runUid !== undefined && recordedRuns.get(tool.toolCallId) === run.runUid;
    if (!persisted || !sameRun || !agentToolIsTerminal(persisted.status))
      tools.set(tool.toolCallId, {
        ...tool,
        recordedRunUid: tool.recordedRunUid ?? run.runUid
      });
  }
}

// Conservative presentation proof, not an execution/permission classifier. Extend only with
// explicitly verified read-only tools; unfamiliar successful tools may have written state.
const cancellationSummaryReads = new Set(['tool.search', 'alert_inhibit.get', 'alert_inhibit.list']);

export function isCancelledBeforeApprovalOnly(run: AgentWorkspaceRunState): boolean {
  const summary = run.executionSummary;
  const tools = run.tools.filter(tool => tool.recordedRunUid === run.runUid);
  if (
    !run.runUid ||
    !run.cancelled ||
    !summary ||
    summary.truncated ||
    !tools.length ||
    summary.totalAttempts !== tools.length ||
    summary.unfinishedAttempts !== 0
  )
    return false;
  const cancelled = (tool: AgentToolActivity) =>
    tool.status === 'CANCELLED' && tool.errorMessage === 'CANCELLED_BEFORE_APPROVAL_NOT_EXECUTED';
  const cancelledCount = tools.filter(cancelled).length;
  return (
    cancellationLedgerMatches(summary, tools.length, cancelledCount) &&
    tools.every(
      tool => cancelled(tool) || (tool.status === 'SUCCEEDED' && cancellationSummaryReads.has(tool.toolName))
    ) &&
    summary.failures.every(failure => failure.errorMessage === 'CANCELLED_BEFORE_APPROVAL_NOT_EXECUTED')
  );
}

function cancellationLedgerMatches(
  summary: NonNullable<AgentWorkspaceRunState['executionSummary']>,
  total: number,
  cancelled: number
) {
  return (
    cancelled > 0 &&
    summary.failedAttempts === cancelled &&
    summary.succeededAttempts === total - cancelled &&
    summary.failures.length === cancelled &&
    (summary.unresolvedAttempts === 0 || summary.unresolvedAttempts === cancelled)
  );
}

export type AgentWorkspaceViewModel = {
  permission?: import('./agent-permission-mode').AgentPermissionControl;
  batch?: import('./agent-batch').AgentBatchView;
  sessions: AgentLoadable<AgentSession>;
  sessionDeletion?: AgentSessionDeletion;
  selectedSessionUid?: string;
  transcript: AgentLoadable<AgentTranscriptMessage> & {
    olderPageIndex?: number;
    olderStatus?: 'loading' | 'ready' | 'error';
  };
  draftMessages: AgentDraftMessage[];
  run: AgentWorkspaceRunState;
  target?: AgentTargetRef;
  invalidTarget: boolean;
  composer: string;
  streaming: boolean;
  stopping: boolean;
  failure?: 'unavailable';
  transportFailure?: import('./agent-transport-diagnostic').AgentTransportFailure | undefined;
  actions: {
    loadOlder?: () => Promise<void>;
    requestDeleteSession?: (sessionUid: string) => void;
    requestClearSessions?: () => Promise<void>;
    cancelSessionDeletion?: () => void;
    confirmSessionDeletion?: () => Promise<void>;
    selectSession: (sessionUid: string) => Promise<void>;
    newInvestigation: () => void;
    setComposer: (value: string) => void;
    send: () => Promise<void>;
    stop: () => Promise<void>;
    retry: () => Promise<void>;
    recover: () => Promise<void>;
    reviseApproval?: (approvalId: string, revision: string) => Promise<boolean>;
    decideApproval: (approvalId: string, decision: 'approve' | 'reject', collectionPlanHash?: string) => Promise<void>;
    submitInteraction: (interactionId: string, values: Record<string, unknown>) => Promise<void>;
  };
};

export type AgentProviderViewModel = {
  connectionTest?: ProviderConnectionTest;
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
