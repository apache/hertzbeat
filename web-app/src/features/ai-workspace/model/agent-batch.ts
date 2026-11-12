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

export type AgentBatchItem = {
  id: string;
  name: string | null;
  target: string | null;
  arguments: Record<string, unknown>;
  status: string;
  monitorId: string | null;
  reason: string | null;
  toolCallId: string | null;
  approvalId: string | null;
  approvalTool: string | null;
  receiptKind: 'NATIVE_RECEIPT' | 'STATE_READBACK' | 'MATCH_ONLY' | 'NONE';
};
export type AgentBatchProgress = {
  version: 'monitor-batch-progress.v1';
  batchUid: string;
  planHash: string;
  runUid: string;
  segment: number;
  resumeFromRunUid: string;
  runStatus: string;
  stage: 'RUNNING' | 'WAITING_APPROVAL' | 'COMPLETE' | 'REVIEW_REQUIRED' | 'PAUSED';
  operation: string;
  total: number;
  verified: number;
  pending: number;
  reviewRequired: number;
  toolCalls: number;
  toolBudget: number;
  nextAction: 'NONE' | 'CONTINUE' | 'RECONCILE';
  actionReason: string | null;
  observedAt: number;
  items: AgentBatchItem[];
};
export type AgentBatchView = {
  progress?: AgentBatchProgress;
  busy: boolean;
  stopping: boolean;
  stop: () => Promise<void>;
  unavailable: boolean;
  continue: () => Promise<void>;
};
export const agentWorkspaceQueryKeys = {
  batch: (runUid: string | undefined) => ['ai-workspace', 'batch', runUid] as const,
  permission: (sessionUid: string | undefined) => ['ai-workspace', 'permission', sessionUid] as const
};
