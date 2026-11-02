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

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cancelProposalForRevision } from './agent-revise-proposal';
const api = vi.hoisted(() => ({ getAgentRun: vi.fn(), stopAgentRun: vi.fn() }));
vi.mock('../api/agent-gateway-api', () => api);
const active = () => ({
  runUid: 'run',
  sessionUid: 'session',
  status: 'RUNNING',
  approvalRecoveryUnavailable: false,
  recoveredApprovals: [
    { approvalId: 'a', status: 'WAITING_APPROVAL', canDecide: true },
    { approvalId: 'b', status: 'WAITING_APPROVAL', canDecide: true }
  ]
});
const cancelled = () => ({
  ...active(),
  status: 'CANCELLED',
  recoveredApprovals: [
    { approvalId: 'a', status: 'UNAVAILABLE', canDecide: false },
    { approvalId: 'b', status: 'UNAVAILABLE', canDecide: false }
  ]
});
describe('cancel whole proposal run before manual revision', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });
  it('confirms server cancellation and every pending capability is closed without changing payloads', async () => {
    const original = active();
    const saved = JSON.stringify(original);
    api.getAgentRun.mockResolvedValueOnce(original).mockResolvedValueOnce(cancelled());
    api.stopAgentRun.mockResolvedValue({ accepted: true });
    const result = await cancelProposalForRevision('run', 'a', () => true);
    expect(result.status).toBe('CANCELLED');
    expect(api.stopAgentRun).toHaveBeenCalledExactlyOnceWith('run');
    expect(JSON.stringify(original)).toBe(saved);
    expect(api.getAgentRun).toHaveBeenCalledTimes(2);
  });
  it('never cancels expired, failed or unrelated proposals', async () => {
    for (const original of [
      { ...active(), status: 'FAILED' },
      { ...active(), recoveredApprovals: [{ approvalId: 'a', status: 'EXPIRED', canDecide: false }] },
      { ...active(), approvalRecoveryUnavailable: true },
      { ...active(), recoveredApprovals: [] }
    ]) {
      api.getAgentRun.mockResolvedValueOnce(original);
      await expect(
        cancelProposalForRevision(
          'run',
          original.recoveredApprovals.some(a => a.approvalId === 'a') ? 'a' : 'foreign',
          () => true
        )
      ).rejects.toThrow();
    }
    expect(api.stopAgentRun).not.toHaveBeenCalled();
  });
  it('does not treat accepted cancellation as a terminal result', async () => {
    vi.useFakeTimers();
    api.getAgentRun.mockResolvedValue(active());
    api.stopAgentRun.mockResolvedValue({ accepted: true });
    const rejected = expect(cancelProposalForRevision('run', 'a', () => true)).rejects.toThrow(
      'cancellation-not-confirmed'
    );
    await vi.advanceTimersByTimeAsync(5000);
    await rejected;
    expect(api.stopAgentRun).toHaveBeenCalledTimes(1);
  });
  it('refuses to revise if any old proposal can still be decided', async () => {
    api.getAgentRun
      .mockResolvedValueOnce(active())
      .mockResolvedValueOnce({ ...cancelled(), recoveredApprovals: active().recoveredApprovals });
    await expect(cancelProposalForRevision('run', 'a', () => true)).rejects.toThrow('pending-decision-still-active');
  });
  it('does not follow a changed run/session or missing recovery state', async () => {
    for (const result of [
      { ...cancelled(), runUid: 'other' },
      { ...cancelled(), sessionUid: 'other' },
      { ...cancelled(), approvalRecoveryUnavailable: true }
    ]) {
      api.getAgentRun.mockResolvedValueOnce(active()).mockResolvedValueOnce(result);
      await expect(cancelProposalForRevision('run', 'a', () => true)).rejects.toThrow('cancellation-unverified');
    }
  });
  it('context switches before stop cannot cancel another task', async () => {
    api.getAgentRun.mockResolvedValue(active());
    await expect(cancelProposalForRevision('run', 'a', () => false)).rejects.toThrow('proposal-not-active');
    expect(api.stopAgentRun).not.toHaveBeenCalled();
  });
  it('navigation while cancellation is accepted never prepares a different session', async () => {
    let current = true;
    api.getAgentRun.mockResolvedValue(active());
    api.stopAgentRun.mockImplementation(() => {
      current = false;
      return Promise.resolve();
    });
    await expect(cancelProposalForRevision('run', 'a', () => current)).rejects.toThrow('revision-context-changed');
    expect(api.getAgentRun).toHaveBeenCalledTimes(1);
    expect(api.stopAgentRun).toHaveBeenCalledTimes(1);
  });
});
