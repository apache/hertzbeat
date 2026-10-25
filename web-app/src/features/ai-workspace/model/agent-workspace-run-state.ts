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

/** Shared run-state shapes for the workspace reducer and its retry projection. */
export type AgentRunMessage = { id: string; text: string; status: 'streaming' | 'complete' };

export type AgentToolActivity = {
  toolCallId: string;
  toolName: string;
  status: string;
  elapsedMs?: number;
  errorMessage?: string;
};

export type AgentApproval = { approvalId: string; toolCallId: string; toolName: string; status: string };

export type AgentInputRequest = {
  interactionId: string;
  targetTool: string;
  title: string;
  description: string;
  fields: Record<string, unknown>[];
  status: string;
};

export type AgentModelRetry = {
  attempt: number;
  maxAttempts: number;
  delayMs?: number;
  errorMessage?: string;
};

export type AgentWorkspaceRunState = {
  runUid?: string;
  status: 'idle' | 'running' | 'complete' | 'error';
  messages: AgentRunMessage[];
  tools: AgentToolActivity[];
  approvals: AgentApproval[];
  inputs: AgentInputRequest[];
  errorMessage?: string;
  observationExpired?: boolean;
  recoveryAvailable?: boolean;
  retryAvailable?: boolean;
  recoveryRequired?: boolean;
  targetFailure?: 'mismatch' | 'unavailable';
  modelRetry?: AgentModelRetry;
};

export const initialAgentWorkspaceRun: AgentWorkspaceRunState = {
  status: 'idle',
  messages: [],
  tools: [],
  approvals: [],
  inputs: []
};
