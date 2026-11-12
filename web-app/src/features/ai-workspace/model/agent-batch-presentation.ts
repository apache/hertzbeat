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

export function batchActionKey(progress: AgentBatchProgress) {
  if (progress.stage === 'RUNNING' || progress.stage === 'WAITING_APPROVAL') return 'reconnect';
  if (progress.reviewRequired > 0 || progress.nextAction === 'RECONCILE') return 'reconcile';
  return progress.actionReason === 'PREFLIGHT_FAILED' ? 'retryPreflight' : 'continue';
}

export function batchSessionStatus(status: string, runUid: string | undefined, progress?: AgentBatchProgress) {
  if (status.toUpperCase() !== 'FAILED' || !runUid || progress?.runUid !== runUid) return status;
  if (progress.reviewRequired > 0) return 'RECOVERY_REQUIRED';
  return progress.stage === 'PAUSED' && progress.verified > 0 && progress.verified < progress.total
    ? 'PARTIAL'
    : status;
}

/** Status copy describes the segment outcome, not an implied future write. */
export function batchStageKey(progress: AgentBatchProgress) {
  if (progress.runStatus === 'CANCELLED') return 'aiWorkspace.batch.cancelled';
  if (progress.stage === 'PAUSED') {
    if (progress.actionReason === 'PREFLIGHT_FAILED') return 'aiWorkspace.batch.preflightStopped';
    if (progress.nextAction === 'NONE') return 'aiWorkspace.batch.ended';
  }
  return `aiWorkspace.batch.stage.${progress.stage}`;
}
