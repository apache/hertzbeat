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

import type { AgentBatchProgress } from './agent-batch';
export function batchFixture(): AgentBatchProgress {
  return {
    version: 'monitor-batch-progress.v1',
    batchUid: 'root',
    planHash: 'a'.repeat(64),
    runUid: 'root',
    segment: 0,
    resumeFromRunUid: 'root',
    runStatus: 'FAILED',
    stage: 'PAUSED',
    operation: 'CREATE',
    total: 2,
    verified: 1,
    pending: 1,
    reviewRequired: 0,
    toolCalls: 5,
    toolBudget: 5,
    nextAction: 'CONTINUE',
    actionReason: null,
    observedAt: 1,
    items: [0, 1].map(index => ({
      id: `item-${index}`,
      name: `local-${index}`,
      target: `http://127.0.0.1:1/${index}`,
      arguments: { intervals: 600 },
      status: index === 0 ? 'VERIFIED' : 'PENDING',
      monitorId: index === 0 ? '1' : null,
      reason: null,
      toolCallId: index === 0 ? 'write-0' : null,
      approvalId: null,
      approvalTool: null,
      receiptKind: index === 0 ? 'NATIVE_RECEIPT' : 'NONE'
    }))
  };
}
