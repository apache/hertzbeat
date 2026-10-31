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

import { getAgentRun, stopAgentRun } from '../api/agent-gateway-api';
import type { AgentRunSnapshot } from '../model/agent-workspace-contract';
/** Cancel a whole run, never decide or rewrite one of its pending tool payloads. */
export async function cancelProposalForRevision(
  runUid: string,
  approvalId: string,
  current: () => boolean
): Promise<AgentRunSnapshot> {
  const original = await getAgentRun(runUid);
  if (!current() || !activeProposal(original, runUid, approvalId)) throw new Error('proposal-not-active');
  await stopAgentRun(runUid);
  for (let attempt = 0; attempt < 20; attempt++) {
    if (!current()) throw new Error('revision-context-changed');
    const snapshot = await getAgentRun(runUid);
    if (!sameRun(snapshot, original)) throw new Error('cancellation-unverified');
    if (snapshot.status === 'CANCELLED') {
      if (!snapshot.recoveredApprovals || snapshot.recoveredApprovals.some(a => a.canDecide))
        throw new Error('pending-decision-still-active');
      return snapshot;
    }
    if (snapshot.status !== 'RUNNING' && snapshot.status !== 'CREATED')
      throw new Error('run-ended-before-cancellation');
    await new Promise<void>(resolve => window.setTimeout(resolve, 250));
  }
  throw new Error('cancellation-not-confirmed');
}

function activeProposal(snapshot: AgentRunSnapshot, runUid: string, approvalId: string) {
  return (
    snapshot.runUid === runUid &&
    snapshot.status === 'RUNNING' &&
    !snapshot.approvalRecoveryUnavailable &&
    snapshot.recoveredApprovals?.some(
      a => a.approvalId === approvalId && a.canDecide && a.status === 'WAITING_APPROVAL'
    )
  );
}
function sameRun(snapshot: AgentRunSnapshot, original: AgentRunSnapshot) {
  return (
    snapshot.runUid === original.runUid &&
    snapshot.sessionUid === original.sessionUid &&
    !snapshot.approvalRecoveryUnavailable
  );
}
