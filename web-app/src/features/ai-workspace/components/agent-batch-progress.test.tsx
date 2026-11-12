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

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { initializeI18n, loadLocale, i18n } from '@/core/i18n/i18n';
import type { AgentBatchProgress as Progress } from '../model/agent-batch';
import { batchFixture } from '../model/agent-batch-fixture';
import { AgentBatchProgress } from './agent-batch-progress';
function view(progress: Progress, errors: { batch?: boolean; transport?: boolean } = {}) {
  const next = vi.fn().mockResolvedValue(undefined);
  const approve = vi.fn().mockResolvedValue(undefined);
  render(
    <I18nextProvider i18n={i18n}>
      <AgentBatchProgress
        batch={{
          progress,
          busy: false,
          stopping: false,
          unavailable: errors.batch ?? false,
          continue: next,
          stop: vi.fn().mockResolvedValue(undefined)
        }}
        controller={{
          streaming: false,
          stopping: false,
          ...(errors.transport ? { failure: 'unavailable' as const } : {}),
          actions: { decideApproval: approve }
        }}
      />
    </I18nextProvider>
  );
  return { next, approve };
}
describe('batch progress presentation', () => {
  it('does not label a disconnected chat stream as a failed batch progress read', () => {
    const progress = batchFixture();
    progress.stage = 'WAITING_APPROVAL';
    progress.nextAction = 'NONE';
    const actions = view(progress, { transport: true });
    expect(screen.queryByText(i18n.t('aiWorkspace.batch.unavailable'))).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(actions.approve).not.toHaveBeenCalled();
    expect(actions.next).not.toHaveBeenCalled();
  });
  it('retains an actual batch progress failure even with an available chat stream', () => {
    const progress = batchFixture();
    progress.stage = 'WAITING_APPROVAL';
    view(progress, { batch: true });
    expect(screen.getByText(i18n.t('aiWorkspace.batch.unavailable'))).toBeInTheDocument();
  });

  it('does not promise continuation for terminal preflight failures or an absent next action', () => {
    const progress = batchFixture();
    progress.actionReason = 'PREFLIGHT_FAILED';
    progress.nextAction = 'NONE';
    view(progress);
    expect(
      screen.getByText('This segment ended with preflight failures. Verified resources will not be created again.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('This segment is paused; explicitly continue the remaining items')
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue remaining items' })).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'Targets and parameters are frozen. Each segment uses the original run budget and requires an explicit action. Completed or uncertain writes are never repeated.'
      )
    ).not.toBeInTheDocument();
  });
  it('distinguishes a terminal segment without an authorized next action', () => {
    const progress = batchFixture();
    progress.nextAction = 'NONE';
    view(progress);
    expect(screen.getByText('This segment has ended. No continuation action is available.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue remaining items' })).not.toBeInTheDocument();
  });

  it('never offers continuation for a cancelled run even with a stale continue action', () => {
    const progress = batchFixture();
    progress.runStatus = 'CANCELLED';
    progress.nextAction = 'CONTINUE';
    const actions = view(progress);
    expect(screen.queryByRole('button', { name: 'Continue remaining items' })).not.toBeInTheDocument();
    expect(actions.next).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        'Cancelled. This run has ended. Its history is retained; it will not continue or retry automatically.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText('This segment is paused; explicitly continue the remaining items')
    ).not.toBeInTheDocument();
  });

  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);
  it('renders fifty-item progress only from server-verified item counts', () => {
    for (const verified of [0, 10, 40, 50]) {
      cleanup();
      const progress = batchFixture();
      progress.total = 50;
      progress.verified = verified;
      progress.pending = 50 - verified;
      progress.reviewRequired = 0;
      progress.runStatus = verified === 50 ? 'SUCCEEDED' : 'RUNNING';
      progress.stage = verified === 50 ? 'COMPLETE' : 'RUNNING';
      progress.nextAction = 'NONE';
      progress.items = Array.from({ length: 50 }, (_, index) => ({
        ...progress.items[0]!,
        id: `fixture-${index}`,
        name: `fixture-${index}`,
        status: index < verified ? 'VERIFIED' : 'PENDING',
        monitorId: index < verified ? `${index + 1}` : null,
        receiptKind: index < verified ? 'NATIVE_RECEIPT' : 'NONE'
      }));
      const actions = view(progress);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', `${verified * 2}`);
      expect(screen.getByRole('status')).toHaveTextContent(`${verified} / 50 verified`);
      expect(actions.approve).not.toHaveBeenCalled();
      expect(actions.next).not.toHaveBeenCalled();
    }
  });
  it('shows partial counts and starts only after the explicit remaining-items action', () => {
    const actions = view(batchFixture());
    expect(screen.getByText('1 / 2 verified · 1 remaining · 0 require review')).toBeInTheDocument();
    expect(screen.queryByText('All frozen items verified')).not.toBeInTheDocument();
    expect(actions.next).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Continue remaining items' }));
    expect(actions.next).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText('Frozen parameters')).toHaveLength(2);
  });
  it('never counts a matching candidate as a native creation receipt', () => {
    const progress = batchFixture();
    progress.verified = 0;
    progress.reviewRequired = 1;
    progress.stage = 'REVIEW_REQUIRED';
    progress.nextAction = 'RECONCILE';
    progress.items[0] = { ...progress.items[0]!, status: 'MATCHED_REVIEW', receiptKind: 'MATCH_ONLY' };
    view(progress);
    expect(screen.getByText('0 / 2 verified · 1 remaining · 1 require review')).toBeInTheDocument();
    expect(screen.getByText('Candidate only; review required')).toBeInTheDocument();
    expect(screen.queryByText('Native receipt')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Read-only reconciliation' })).toBeInTheDocument();
  });
  it('keeps a reloaded pending approval attached to its original native approval ID', () => {
    const progress = batchFixture();
    progress.stage = 'WAITING_APPROVAL';
    progress.runStatus = 'RUNNING';
    progress.nextAction = 'NONE';
    progress.items[1] = {
      ...progress.items[1]!,
      status: 'WAITING_APPROVAL',
      approvalId: 'approval-original',
      approvalTool: 'monitor.create'
    };
    const actions = view(progress);
    const row = screen.getByText('local-1').closest('tr')!;
    fireEvent.click(within(row).getByRole('button', { name: 'Approve' }));
    expect(actions.approve).toHaveBeenCalledWith('approval-original', 'approve');
  });
  it('labels a preflight retry explicitly and never starts it automatically', () => {
    const progress = batchFixture();
    progress.actionReason = 'PREFLIGHT_FAILED';
    const actions = view(progress);
    expect(screen.queryByRole('button', { name: 'Continue remaining items' })).not.toBeInTheDocument();
    expect(actions.next).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry failed preflight checks' }));
    expect(actions.next).toHaveBeenCalledTimes(1);
  });
});
