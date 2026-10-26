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

import type { AgentApprovalSummary } from './agent-approval-summary';

import type {
  AgentEntityInvestigationSource,
  AgentEntityInvestigationTarget,
  AgentIncidentTarget
} from './agent-investigation-target';
import type { AgentMessagePart } from './agent-message-parts';
import type { AgentEvidence } from './agent-evidence';
import type { AgentExecutionSummary } from './agent-execution-summary';
export type { AgentExecutionSummary, AgentQueryCoverage } from './agent-execution-summary';

type AgentMonitorMetricSignal = {
  type: 'metrics';
  query: string;
  start: number;
  end: number;
  timezone: string;
};

export type AgentMonitorMetricSourceTarget = {
  monitorId: number;
  signal: AgentMonitorMetricSignal;
};

type AgentSingleAlertSourceTarget = {
  alertId: number;
  alertType: 'single';
};

type AgentEntitySourceTarget = {
  entityId: number;
};

export type AgentTopologyRef = {
  rootEntityId: number;
  nodeId?: string;
  edgeId?: string;
  depth: 1 | 2;
  environment?: string;
  sourceKind: string;
  start?: number;
  end?: number;
  relationType?: string;
  hideInternal: boolean;
  pageIndex: number;
  pageSize: number;
};

export type AgentTopologySourceTarget = {
  topology: AgentTopologyRef;
};

export type AgentTraceRef = {
  traceId: string;
  spanId?: string;
  start: number;
  end: number;
  serviceName?: string;
  serviceNamespace?: string;
  environment?: string;
  resourceFilter?: string;
  attributeFilter?: string;
  minDurationMs?: number;
  maxDurationMs?: number;
};

export type AgentTraceSourceTarget = {
  trace: AgentTraceRef;
};

export type AgentLogRef = {
  start: number;
  end: number;
  traceId?: string;
  spanId?: string;
  severityNumber?: number;
  severityText?: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  search?: string;
  serviceName?: string;
  serviceNamespace?: string;
  environment?: string;
  resourceFilter?: string;
  attributeFilter?: string;
  hideInternal: boolean;
  hideNoise: boolean;
  pageIndex: number;
  pageSize: number;
};

export type AgentLogSourceTarget = { log: AgentLogRef };

export type AgentSourceTarget =
  | AgentEntityInvestigationSource
  | AgentMonitorMetricSourceTarget
  | AgentSingleAlertSourceTarget
  | AgentEntitySourceTarget
  | AgentTopologySourceTarget
  | AgentTraceSourceTarget
  | AgentLogSourceTarget;

type AgentCanonicalMonitorMetricTarget = AgentMonitorMetricSourceTarget & {
  version: string;
  entityId: number;
  service: {
    name: string;
    namespace?: string;
    environment?: string;
  };
};

type AgentCanonicalSingleAlertTarget = AgentSingleAlertSourceTarget & {
  version: string;
};

type AgentCanonicalEntityTarget = AgentEntitySourceTarget & {
  version: string;
};

type AgentCanonicalTopologyTarget = AgentTopologySourceTarget & {
  version: string;
  entityId: number;
};

type AgentCanonicalTraceTarget = AgentTraceSourceTarget & {
  version: string;
};

type AgentCanonicalLogTarget = AgentLogSourceTarget & {
  version: string;
};

type AgentCanonicalTarget =
  | AgentCanonicalMonitorMetricTarget
  | AgentCanonicalSingleAlertTarget
  | AgentCanonicalEntityTarget
  | AgentCanonicalTopologyTarget
  | AgentCanonicalTraceTarget
  | AgentCanonicalLogTarget;

export type AgentTargetRef =
  AgentSourceTarget | AgentCanonicalTarget | AgentEntityInvestigationTarget | AgentIncidentTarget;

export const agentGatewayEventTypes = [
  'RUN_STARTED',
  'MESSAGE_STARTED',
  'MESSAGE_DELTA',
  'MESSAGE_COMPLETED',
  'TOOL_STARTED',
  'TOOL_COMPLETED',
  'INPUT_REQUESTED',
  'INPUT_COMPLETED',
  'APPROVAL_REQUESTED',
  'APPROVAL_COMPLETED',
  'RUN_STATUS',
  'RUN_COMPLETED',
  'ERROR'
] as const;

export type AgentGatewayEvent = {
  type: (typeof agentGatewayEventTypes)[number];
  eventId: string;
  conversationId: string | null;
  sessionUid: string | null;
  runUid: string | null;
  itemId: string | null;
  payload: Record<string, unknown>;
  messageParts?: AgentMessagePart[];
  timestamp: number;
};

export type AgentChatRequest = {
  conversationId: string;
  messageId: string;
  message: string;
  target?: AgentSourceTarget;
  attachments: string[];
  /** Internal transport metadata. The API adapter maps this to Accept-Language and strips it from JSON. */
  preferredLanguage?: string;
};

export type AgentRetryRequest = {
  conversationId: string;
  messageId: string;
  message: string;
  target: AgentSourceTarget | null;
  attachments: string[];
  preferredLanguage: string;
};

export type AgentSession = {
  id: number;
  sessionUid: string;
  conversationId: string | null;
  status: string;
  title: string | null;
  gmtCreate: string | null;
  gmtUpdate: string | null;
};

export type AgentRecoveredApproval = {
  summary?: AgentApprovalSummary | null | undefined;
  approvalId: string;
  toolCallId: string;
  toolName: string;
  status: 'WAITING_APPROVAL' | 'EXPIRED' | 'UNAVAILABLE' | 'APPROVED' | 'REJECTED' | 'PENDING' | 'NOT_REQUIRED';
  expiresAt: string | null;
  canDecide: boolean;
};

export type AgentRunSnapshot = {
  recoveredApprovals?: AgentRecoveredApproval[];
  approvalRecoveryUnavailable?: boolean;
  executionSummary?: AgentExecutionSummary | null | undefined;
  evidence?: AgentEvidence[] | undefined;
  runUid: string;
  sessionUid: string;
  messageId: string;
  status: 'CREATED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'RECOVERY_REQUIRED';
  target: AgentTargetRef | null;
  result: string | null;
  errorMessage: string | null;
  replayAvailable: boolean;
  startedAt: string | null;
  completedAt: string | null;
  retryRequest: AgentRetryRequest | null;
};

export type AgentTranscriptMessage = {
  id: number;
  recordedRunUid?: string;
  sequence: number;
  role: 'user' | 'assistant' | 'toolResult' | 'compactionSummary';
  text: string;
  parts?: AgentMessagePart[];
  toolCalls?: { toolCallId: string; toolName: string }[];
  toolStatus?: 'RUNNING' | 'WAITING_APPROVAL' | 'SUCCEEDED' | 'FAILED' | 'DENIED';
  toolElapsedMs?: number;
  toolCallId?: string;
  toolName?: string;
  errorMessage?: string;
  createdAt: string | null;
};

export type {
  AgentProviderOption,
  AgentProviderConfiguration,
  AgentProviderConfigurationView,
  AgentProviderInput
} from './agent-provider-contract';
