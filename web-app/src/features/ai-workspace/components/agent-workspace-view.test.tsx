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

import { AgentWorkspaceMessage } from './agent-workspace-message';
import { AgentExecutionSummary } from './agent-execution-summary';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import { AgentWorkspaceView } from './agent-workspace-view';
import { batchFixture } from '../model/agent-batch-fixture';

describe('AgentWorkspaceView', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('distinguishes an unsent admission timeout and exposes only its correlation ID', () => {
    const controller = fixture();
    controller.failure = 'unavailable';
    controller.run.status = 'idle';
    controller.transportFailure = { requestId: '12345678-1234-1234-1234-123456789abc', code: 'QUEUE_TIMEOUT' };
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView
          controller={controller}
          isAdmin={false}
          onOpenProviders={vi.fn()}
          onOpenSchedules={vi.fn()}
        />
      </I18nextProvider>
    );
    expect(screen.getByText(i18n.t('aiWorkspace.transportFailure.QUEUE_TIMEOUT'))).toBeInTheDocument();
    expect(
      screen.getByText(i18n.t('aiWorkspace.transportFailure.requestId', { id: controller.transportFailure.requestId }))
    ).toBeInTheDocument();
  });

  it('shows stream recovery separately while keeping a healthy waiting batch visible', () => {
    const controller = fixture();
    controller.failure = 'unavailable';
    controller.run.status = 'running';
    delete controller.run.errorMessage;
    const progress = batchFixture();
    progress.stage = 'WAITING_APPROVAL';
    progress.nextAction = 'NONE';
    controller.batch = { progress, busy: false, stopping: false, unavailable: false, continue: vi.fn(), stop: vi.fn() };
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView
          controller={controller}
          isAdmin={false}
          onOpenProviders={vi.fn()}
          onOpenSchedules={vi.fn()}
        />
      </I18nextProvider>
    );
    expect(screen.getByText(i18n.t('aiWorkspace.failure'))).toBeInTheDocument();
    expect(screen.queryByText(i18n.t('aiWorkspace.batch.unavailable'))).not.toBeInTheDocument();
    expect(controller.actions.decideApproval).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.retry') }));
    expect(controller.actions.selectSession).toHaveBeenCalledWith('session-1');
    expect(controller.actions.decideApproval).not.toHaveBeenCalled();
    expect(controller.actions.recover).not.toHaveBeenCalled();
  });

  it('does not show active reconnect failure on a completed run and retains real recorded failures', () => {
    const controller = fixture();
    controller.failure = 'unavailable';
    controller.run.status = 'complete';
    controller.run.approvals = [];
    controller.run.tools = [{ toolCallId: 'cancelled', toolName: 'alert_inhibit.create', status: 'CANCELLED' }];
    controller.transcript.items = [
      {
        id: 900,
        sequence: 900,
        role: 'toolResult',
        text: '',
        toolName: 'logs.query',
        toolCallId: 'historical-failure',
        toolStatus: 'FAILED',
        errorMessage: 'Historical warehouse failure',
        createdAt: null
      }
    ];
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView
          controller={controller}
          isAdmin={false}
          onOpenProviders={() => undefined}
          onOpenSchedules={() => undefined}
        />
      </I18nextProvider>
    );
    expect(screen.queryByText(i18n.t('aiWorkspace.failure'))).not.toBeInTheDocument();
    expect(screen.getByText('Historical warehouse failure')).toBeInTheDocument();
    expect(screen.getByText(i18n.t('aiWorkspace.context.cancelledBeforeExecution'))).toBeInTheDocument();
  });

  it('completes a count while keeping partial row coverage inside collapsed details', () => {
    const controller = fixture();
    delete controller.target;
    delete controller.run.errorMessage;
    controller.run.status = 'complete';
    controller.run.approvals = [];
    controller.run.tools = [{ toolCallId: 'count', toolName: 'monitor.query', status: 'SUCCEEDED' }];
    controller.run.messages = [{ id: 'count-answer', text: 'Currently there are 6 monitors.', status: 'complete' }];
    controller.transcript.items = [
      { id: 1, sequence: 1, role: 'user', text: 'How many monitors are there?', createdAt: '2026-08-13T08:00:00' }
    ];
    controller.run.executionSummary = {
      status: 'NO_FAILED_ATTEMPTS',
      totalAttempts: 1,
      succeededAttempts: 1,
      failedAttempts: 0,
      recoveredAttempts: 0,
      unresolvedAttempts: 0,
      unfinishedAttempts: 0,
      failures: [],
      truncated: false,
      queryCoverage: [
        {
          toolCallId: 'count',
          toolName: 'monitor.query',
          state: 'PARTIAL_PAGE',
          unit: 'rows',
          start: null,
          end: null,
          offset: 0,
          returned: 1,
          total: 6,
          partial: true,
          truncated: false,
          scope: { purpose: 'COUNT' }
        }
      ]
    };
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView controller={controller} isAdmin onOpenProviders={vi.fn()} onOpenSchedules={vi.fn()} />
      </I18nextProvider>
    );
    expect(screen.getByText('Currently there are 6 monitors.')).toBeVisible();
    expect(screen.queryByText(i18n.t('aiWorkspace.executionSummary.compact.PARTIAL'))).not.toBeInTheDocument();
    expect(screen.queryByText('Verified observations')).not.toBeInTheDocument();
    expect(screen.getByText('Returned 1 / total 6 rows; offset 0')).not.toBeVisible();
    fireEvent.click(screen.getByText(i18n.t('aiWorkspace.executionSummary.compact.NO_FAILED_ATTEMPTS')));
    expect(screen.getByText('Returned 1 / total 6 rows; offset 0')).toBeVisible();
  });

  it('shows server PARTIAL execution facts independently of a false model success claim', () => {
    const controller = fixture();
    controller.run.executionSummary = {
      status: 'PARTIAL',
      totalAttempts: 2,
      succeededAttempts: 1,
      failedAttempts: 1,
      recoveredAttempts: 0,
      unresolvedAttempts: 1,
      unfinishedAttempts: 0,
      truncated: false,
      failures: [
        {
          toolCallId: 'call-failed',
          toolName: 'metrics.history',
          status: 'FAILED',
          errorMessage: 'fieldParameter is required',
          recovery: 'CHANGED_REQUEST_SUCCEEDED_SCOPE_UNVERIFIED',
          laterSuccessToolCallId: 'call-next'
        }
      ]
    };
    controller.run.messages = [{ id: 'claim', text: 'All calls succeeded; no errors.', status: 'complete' }];
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView controller={controller} isAdmin onOpenProviders={vi.fn()} onOpenSchedules={vi.fn()} />
      </I18nextProvider>
    );
    expect(screen.getByText('Partial result — some queries remain unverified')).toBeVisible();
    const details = screen.getByText('Partial result — some queries remain unverified').closest('details')!;
    expect(details).not.toHaveAttribute('open');
    expect(screen.getByText('fieldParameter is required')).not.toBeVisible();
    expect(
      screen.getByText('All calls succeeded; no errors.').compareDocumentPosition(details) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    fireEvent.click(details.querySelector('summary')!);
    expect(details).toHaveAttribute('open');
    expect(screen.getByText(/original failed scope unverified/)).toBeInTheDocument();
    expect(screen.getByText('All calls succeeded; no errors.')).toBeInTheDocument();
    expect(screen.getByText('fieldParameter is required')).toBeInTheDocument();
  });

  it('shows exact server page limits without rewriting a model full-coverage claim', () => {
    const controller = fixture();
    controller.run.executionSummary = {
      status: 'PARTIAL',
      totalAttempts: 1,
      succeededAttempts: 1,
      failedAttempts: 0,
      recoveredAttempts: 0,
      unresolvedAttempts: 0,
      unfinishedAttempts: 0,
      failures: [],
      truncated: false,
      stopReason: 'PARTIAL: READ_NO_PROGRESS_BUDGET reached',
      queryCoverage: [
        {
          toolCallId: 'trace-page',
          toolName: 'traces.query',
          state: 'PARTIAL_PAGE',
          unit: 'rows',
          start: 1000,
          end: 2000,
          offset: 0,
          returned: 10,
          total: 85,
          partial: true,
          truncated: false,
          scope: {}
        }
      ]
    };
    controller.run.messages = [{ id: 'claim', text: 'All 85 traces were checked.', status: 'complete' }];
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView controller={controller} isAdmin onOpenProviders={vi.fn()} onOpenSchedules={vi.fn()} />
      </I18nextProvider>
    );
    expect(screen.getByText('All 85 traces were checked.')).toBeInTheDocument();
    expect(screen.getByText('Returned 10 / total 85 rows; offset 0')).not.toBeVisible();
    expect(screen.getByText(/READ_NO_PROGRESS_BUDGET/)).not.toBeVisible();
    fireEvent.click(screen.getByText('Partial result — some queries remain unverified'));
    expect(screen.getByText('Returned 10 / total 85 rows; offset 0')).toBeVisible();
    expect(screen.getByText(/Partial results; not complete coverage/)).toBeInTheDocument();
    expect(screen.getByText(/READ_NO_PROGRESS_BUDGET/)).toBeInTheDocument();
  });

  it('keeps successful execution records collapsed and resets disclosure for another historical run', () => {
    const controller = fixture();
    controller.run.status = 'complete';
    controller.run.executionSummary = {
      status: 'NO_FAILED_ATTEMPTS',
      totalAttempts: 5,
      succeededAttempts: 5,
      failedAttempts: 0,
      recoveredAttempts: 0,
      unresolvedAttempts: 0,
      unfinishedAttempts: 0,
      failures: [],
      truncated: false
    };
    const element = () => (
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView controller={controller} isAdmin onOpenProviders={vi.fn()} onOpenSchedules={vi.fn()} />
      </I18nextProvider>
    );
    const view = render(element());
    const summary = screen.getByText('Execution records').closest('summary')!;
    expect(summary.tabIndex).toBe(0);
    expect(summary.closest('details')).not.toHaveAttribute('open');
    expect(screen.getByText(/5 attempts; 5 succeeded/)).not.toBeVisible();
    fireEvent.click(summary);
    expect(screen.getByText(/5 attempts; 5 succeeded/)).toBeVisible();
    controller.run.runUid = 'another-history-run';
    view.rerender(element());
    expect(screen.getByText('Execution records').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByText(/5 attempts; 5 succeeded/)).not.toBeVisible();
  });

  it('retains an honest failed-run notice while keeping raw failure and tool activity in details', () => {
    const controller = fixture();
    const view = render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView controller={controller} isAdmin onOpenProviders={vi.fn()} onOpenSchedules={vi.fn()} />
      </I18nextProvider>
    );
    expect(screen.getByText('Task failed; the answer may be incomplete')).toBeVisible();
    expect(screen.getByText(/Failed or rejected tool calls: 1/)).not.toBeVisible();
    expect(screen.getByText('Partial result — some queries remain unverified')).toBeVisible();
    const rawError = screen.getByText('The investigation requires a successful data read.');
    expect(rawError).not.toBeVisible();
    const details = rawError.closest('details')!;
    expect(details.querySelector('summary')?.tabIndex).toBe(0);
    fireEvent.click(details.querySelector('summary')!);
    expect(rawError).toBeVisible();
    const activity = screen
      .getByText('Tool activity', { selector: 'summary' })
      .closest('details')!
      .querySelector('section')!;
    expect(activity).not.toBeVisible();
    fireEvent.click(activity.closest('details')!.querySelector('summary')!);
    expect(activity).toBeVisible();
    controller.run.runUid = 'another-failed-run';
    view.rerender(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView controller={controller} isAdmin onOpenProviders={vi.fn()} onOpenSchedules={vi.fn()} />
      </I18nextProvider>
    );
    expect(screen.getByText('The investigation requires a successful data read.')).not.toBeVisible();
    expect(screen.getAllByText('Partial result — some queries remain unverified')).toHaveLength(1);
  });

  it('keeps raw tool and skill results collapsed while rendering the final Markdown report', () => {
    const controller = fixture();
    const raw = '{"content":[{"id":42}],"totalElements":1}';
    controller.transcript.items = [
      { id: 1, sequence: 1, role: 'toolResult', toolName: 'monitor.query', text: raw, createdAt: null },
      {
        id: 2,
        sequence: 2,
        role: 'toolResult',
        toolName: 'skill.load',
        text: '# Internal skill instructions',
        createdAt: null
      },
      {
        id: 3,
        sequence: 3,
        role: 'assistant',
        text: '## Inspection report\n\n| State | Count |\n| --- | --- |\n| Up | 1 |',
        createdAt: null
      }
    ];
    controller.run.messages = [];
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView controller={controller} isAdmin onOpenProviders={vi.fn()} onOpenSchedules={vi.fn()} />
      </I18nextProvider>
    );

    expect(screen.getByRole('heading', { name: 'Inspection report' })).toBeVisible();
    expect(screen.getByRole('table')).toHaveTextContent('Up');
    expect(screen.getByText(raw)).not.toBeVisible();
    expect(screen.getByText('# Internal skill instructions')).not.toBeVisible();
    const summary = screen.getByText('monitor.query').closest('summary');
    expect(summary).not.toBeNull();
    expect(summary?.tabIndex).toBe(0);
    fireEvent.click(summary!);
    expect(screen.getByText(raw)).toBeVisible();
  });

  it('retains long and repeated tool results without hiding their error summaries', () => {
    const controller = fixture();
    const raw = JSON.stringify({ values: 'x'.repeat(20000), last: 'end-of-result' });
    controller.transcript.items = [
      {
        id: 1,
        sequence: 1,
        role: 'toolResult',
        toolName: 'monitor.query',
        text: raw,
        errorMessage: 'Warehouse unavailable',
        createdAt: null
      },
      { id: 2, sequence: 2, role: 'toolResult', toolName: 'monitor.query', text: '{"content":[]}', createdAt: null }
    ];
    controller.run.messages = [];
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView controller={controller} isAdmin onOpenProviders={vi.fn()} onOpenSchedules={vi.fn()} />
      </I18nextProvider>
    );

    const results = document.querySelectorAll('article[data-role="toolResult"] details');
    expect(results).toHaveLength(2);
    expect(screen.getAllByText('monitor.query')).toHaveLength(2);
    expect(screen.getByText('Warehouse unavailable')).not.toBeVisible();
    expect(screen.getByText('Tool failed — view details')).toBeVisible();
    expect(screen.getByText(raw)).not.toBeVisible();
    fireEvent.click(results[0]!.querySelector('summary')!);
    expect(screen.getByText(raw).textContent).toBe(raw);
    expect(screen.getByText(raw)).toBeVisible();
    expect(screen.getByText('Warehouse unavailable')).toBeVisible();
    expect(results[1]).not.toHaveAttribute('open');
  });

  it('renders streamed and replayed answers consistently without executing HTML or hiding requested JSON', () => {
    const controller = fixture();
    controller.transcript = { status: 'loading', items: [] };
    controller.run.messages = [
      {
        id: 'live-message',
        text: '## Live report\n\n**One monitor** observed.\n\n<script>alert(1)</script>\n\n[unsafe](javascript:alert(1))',
        status: 'streaming'
      }
    ];
    const element = () => (
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView controller={controller} isAdmin onOpenProviders={vi.fn()} onOpenSchedules={vi.fn()} />
      </I18nextProvider>
    );
    const view = render(element());
    expect(screen.getByRole('heading', { name: 'Live report' })).toBeVisible();
    expect(screen.getByText('One monitor', { selector: 'strong' })).toBeVisible();
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByRole('link', { name: 'unsafe' }).getAttribute('href')).toMatch(/^(?:#|javascript:void\(0\))?$/);

    const answer = controller.run.messages[0]!.text;
    controller.transcript = {
      status: 'ready',
      items: [
        { id: 1, sequence: 1, role: 'assistant', text: answer, createdAt: null },
        { id: 2, sequence: 2, role: 'assistant', text: '```json\n{"state":"up"}\n```', createdAt: null }
      ]
    };
    controller.run.messages = [];
    view.rerender(element());
    expect(screen.getAllByRole('heading', { name: 'Live report' })).toHaveLength(1);
    expect(screen.getByText('{"state":"up"}')).toBeVisible();
    expect(screen.getByText('{"state":"up"}').closest('details')).toBeNull();
  });

  it('keeps failed tool attempts visible beside a completed model answer', () => {
    const controller = fixture();
    controller.run.status = 'complete';
    controller.run.messages = [{ id: 'final', text: 'All queries succeeded.', status: 'complete' }];
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView controller={controller} isAdmin onOpenProviders={vi.fn()} onOpenSchedules={vi.fn()} />
      </I18nextProvider>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Failed or rejected tool calls: 1');
    expect(screen.getByText('All queries succeeded.')).toBeInTheDocument();
  });

  it('counts the actual lowercase failed stream status as a failure', () => {
    const controller = fixture();
    controller.run.status = 'complete';
    controller.run.tools = [{ toolCallId: 'failed-live', toolName: 'logs.group_by_stats', status: 'failed' }];
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView controller={controller} isAdmin onOpenProviders={vi.fn()} onOpenSchedules={vi.fn()} />
      </I18nextProvider>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Failed or rejected tool calls: 1');
  });

  it('shows attached source scope by default and respects closing until the source changes', () => {
    const controller = fixture();
    controller.run.status = 'idle';
    controller.target = {
      entityId: 42,
      signal: { type: 'investigation', start: 1760000000000, end: 1760000060000, timezone: 'UTC' }
    };
    const element = () => (
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView controller={controller} isAdmin onOpenProviders={vi.fn()} onOpenSchedules={vi.fn()} />
      </I18nextProvider>
    );
    const rendered = render(element());
    expect(screen.getByRole('complementary', { name: 'Run context' })).toHaveTextContent('Bounded cross-signal task');
    expect(screen.getByRole('complementary', { name: 'Run context' })).toHaveTextContent('2025');
    fireEvent.click(screen.getByRole('button', { name: 'Close run details panel' }));
    rendered.rerender(element());
    expect(screen.queryByRole('complementary', { name: 'Run context' })).not.toBeInTheDocument();
    controller.target = { entityId: 43 };
    rendered.rerender(element());
    expect(screen.getByRole('complementary', { name: 'Run context' })).toHaveTextContent('Entity 43');
  });

  it.each([true, false])('renders resident lowercase approval state with server capability %s', canDecide => {
    const controller = fixture();
    controller.run.approvals[0]!.status = 'waiting_approval';
    controller.run.approvals[0]!.canDecide = canDecide;
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView controller={controller} isAdmin onOpenProviders={vi.fn()} onOpenSchedules={vi.fn()} />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open run details' }));
    if (canDecide) {
      fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
      expect(controller.actions.decideApproval).toHaveBeenCalledWith('approval-1', 'approve');
    } else {
      expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
      expect(screen.getByText('This account cannot decide this approval')).toBeInTheDocument();
      expect(controller.actions.decideApproval).not.toHaveBeenCalled();
    }
  });

  it.each(['EXPIRED', 'UNAVAILABLE'])('shows recovered %s approvals without actionable controls', status => {
    const controller = fixture();
    controller.run.approvals[0]!.status = status;
    controller.run.approvals[0]!.canDecide = true;
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView controller={controller} isAdmin onOpenProviders={vi.fn()} onOpenSchedules={vi.fn()} />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open run details' }));
    expect(screen.getAllByText('monitor.disable').length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        status === 'EXPIRED'
          ? 'Approval expired. No operation was authorized.'
          : 'The original approval runtime is no longer available.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(controller.actions.decideApproval).not.toHaveBeenCalled();
  });

  it('requires the exact collection command modal and active confirmation before approval', () => {
    const controller = fixture();
    const hash = 'd'.repeat(64);
    controller.run.approvals = [
      {
        approvalId: 'collection-approval',
        toolCallId: 'collection-call',
        toolName: 'monitor.collection_detect',
        status: 'WAITING_APPROVAL',
        canDecide: true,
        summary: {
          version: 'approval-summary.v1',
          operation: 'REVIEW',
          targetCount: 1,
          inputHash: 'a'.repeat(64),
          complete: true,
          maskedFields: [],
          targets: [],
          changes: [],
          collection: {
            version: 'inline-collection.v1',
            planId: '11111111-1111-1111-1111-111111111111',
            monitorId: 42,
            sourceRevision: 'b'.repeat(64),
            planHash: hash,
            collector: 'main-default-collector',
            operatingSystem: 'Fixture OS',
            account: 'fixture-user',
            directory: '/tmp',
            argv: ['bash', '-c', 'printf fixture'],
            oneShot: true,
            expiresAt: Date.now() + 300000
          }
        }
      }
    ];
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView controller={controller} isAdmin onOpenProviders={vi.fn()} onOpenSchedules={vi.fn()} />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open run details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('printf fixture')).toBeInTheDocument();
    const approve = within(dialog).getByRole('button', { name: 'Approve' });
    expect(approve).toBeDisabled();
    expect(controller.actions.decideApproval).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('checkbox'));
    fireEvent.click(approve);
    expect(controller.actions.decideApproval).toHaveBeenCalledExactlyOnceWith('collection-approval', 'approve', hash);
  });

  it('uses the server approval capability for an ordinary user', () => {
    const controller = fixture();
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView
          controller={controller}
          isAdmin={false}
          onOpenProviders={vi.fn()}
          onOpenSchedules={vi.fn()}
        />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open run details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(controller.actions.decideApproval).toHaveBeenCalledWith('approval-1', 'approve');
  });

  it('fails closed when an approval has no server decision capability, even for administrators', () => {
    const controller = fixture();
    delete controller.run.approvals[0]!.canDecide;
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView controller={controller} isAdmin onOpenProviders={vi.fn()} onOpenSchedules={vi.fn()} />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open run details' }));
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.getByText('This account cannot decide this approval')).toBeInTheDocument();
  });

  it('keeps assistant text and errors when a message also records a tool call', () => {
    const controller = fixture();
    controller.transcript.items.push(
      {
        id: 3,
        sequence: 3,
        role: 'assistant',
        text: 'Checking the log page.',
        toolCalls: [{ toolCallId: 'call-1', toolName: 'logs.query' }],
        createdAt: null
      },
      {
        id: 4,
        sequence: 4,
        role: 'assistant',
        text: '',
        errorMessage: 'The request was interrupted.',
        toolCalls: [{ toolCallId: 'call-2', toolName: 'logs.query' }],
        createdAt: null
      }
    );
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView controller={controller} isAdmin onOpenProviders={vi.fn()} onOpenSchedules={vi.fn()} />
      </I18nextProvider>
    );
    expect(screen.getByText('Checking the log page.')).toBeInTheDocument();
    expect(screen.getByText('The request was interrupted.')).toBeInTheDocument();
  });

  it('keeps the conversation primary and opens run details only when requested', () => {
    const controller = fixture();
    const openSchedules = vi.fn();
    const view = render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView controller={controller} isAdmin onOpenProviders={vi.fn()} onOpenSchedules={openSchedules} />
      </I18nextProvider>
    );

    expect(screen.getByRole('navigation', { name: 'Tasks' })).toHaveTextContent('Checkout latency');
    expect(screen.getByRole('navigation', { name: 'Tasks' })).toHaveTextContent('No runs');
    const conversation = screen.getByRole('region', { name: 'Task' });
    expect(within(conversation).getByRole('heading', { level: 2, name: 'Checkout latency' })).toBeInTheDocument();
    expect(conversation).toHaveTextContent('Why is checkout slow?');
    expect(conversation).toHaveTextContent('monitor.get');
    expect(conversation).toHaveTextContent('Monitor 73 was read.');
    expect(conversation).toHaveTextContent('The investigation requires a successful data read.');
    expect(conversation).toHaveTextContent('The latency increase starts');
    expect(within(conversation).getByRole('button', { name: 'metrics.query' })).not.toBeVisible();
    fireEvent.click(screen.getByText('Tool activity', { selector: 'summary' }));
    expect(within(conversation).getByRole('button', { name: 'metrics.query' })).toHaveTextContent('SUCCEEDED');
    const activityAction = within(conversation).getByRole('button', { name: 'metrics.query' });
    expect(activityAction).not.toHaveAttribute('aria-expanded');
    expect(activityAction).toHaveAttribute('aria-controls', 'agent-run-context');
    expect(screen.queryByRole('complementary', { name: 'Run context' })).not.toBeInTheDocument();
    fireEvent.click(within(conversation).getByRole('button', { name: 'metrics.query' }));
    expect(screen.getByRole('complementary', { name: 'Run context' })).toBeInTheDocument();
    expect(activityAction).not.toHaveAttribute('aria-expanded');
    fireEvent.click(screen.getByRole('button', { name: 'Close run details' }));

    const details = screen.getByRole('button', { name: 'Open run details' });
    expect(details).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(details);

    const context = screen.getByRole('complementary', { name: 'Run context' });
    expect(details).toHaveAttribute('aria-expanded', 'true');
    expect(context).toHaveTextContent('Entity 73');
    expect(context).toHaveTextContent('checkout-db');
    expect(context).toHaveTextContent('entity-monitor-metric.v1');
    expect(context).toHaveTextContent('database');
    expect(context).toHaveTextContent('production');
    expect(context).toHaveTextContent('monitor.disable');
    expect(context).toHaveTextContent('Metrics warehouse unavailable');
    expect(within(context).getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(within(context).getByRole('button', { name: 'Reject' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close run details' }));
    expect(screen.queryByRole('complementary', { name: 'Run context' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Scheduled tasks' }));
    expect(openSchedules).toHaveBeenCalledOnce();

    fireEvent.change(screen.getByRole('textbox', { name: 'Task prompt' }), {
      target: { value: 'Check database waits' }
    });
    view.rerender(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView
          controller={{ ...controller, composer: 'Check database waits' }}
          isAdmin
          onOpenProviders={vi.fn()}
          onOpenSchedules={openSchedules}
        />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(controller.actions.setComposer).toHaveBeenCalledWith('Check database waits');
    expect(controller.actions.send).toHaveBeenCalledOnce();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search tasks' }), {
      target: { value: 'Redis' }
    });
    const sessions = screen.getByRole('navigation', { name: 'Tasks' });
    expect(sessions).toHaveTextContent('Redis saturation');
    expect(sessions).not.toHaveTextContent('Checkout latency');
  });

  it('localizes a cancelled investigation in both the rail and heading', () => {
    const controller = fixture();
    controller.sessions.items[0]!.status = 'CANCELLED';

    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView
          controller={controller}
          isAdmin={false}
          onOpenProviders={vi.fn()}
          onOpenSchedules={vi.fn()}
        />
      </I18nextProvider>
    );

    expect(screen.getByRole('navigation', { name: 'Tasks' })).toHaveTextContent('Cancelled');
    expect(screen.getByRole('region', { name: 'Task' })).toHaveTextContent('Cancelled');
    expect(screen.queryByText('CANCELLED')).not.toBeInTheDocument();
  });

  it('does not offer generic retry for a frozen batch with uncertain outcomes', () => {
    const controller = fixture();
    controller.run.retryAvailable = true;
    controller.run.executionSummary = {
      status: 'PARTIAL',
      totalAttempts: 1,
      succeededAttempts: 1,
      failedAttempts: 0,
      recoveredAttempts: 0,
      unresolvedAttempts: 0,
      unfinishedAttempts: 0,
      failures: [],
      truncated: false,
      stopReason: 'RECOVERY_REQUIRED'
    };
    const progress = batchFixture();
    progress.reviewRequired = 9;
    progress.stage = 'REVIEW_REQUIRED';
    progress.nextAction = 'RECONCILE';
    controller.batch = {
      progress,
      busy: false,
      stopping: false,
      unavailable: false,
      stop: vi.fn().mockResolvedValue(undefined),
      continue: vi.fn().mockResolvedValue(undefined)
    };
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView
          controller={controller}
          isAdmin={false}
          onOpenProviders={vi.fn()}
          onOpenSchedules={vi.fn()}
        />
      </I18nextProvider>
    );
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(controller.actions.retry).not.toHaveBeenCalled();
  });

  it('offers only a fresh retry for an exact restored terminal request', () => {
    const controller = fixture();
    controller.run.retryAvailable = true;

    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView
          controller={controller}
          isAdmin={false}
          onOpenProviders={vi.fn()}
          onOpenSchedules={vi.fn()}
        />
      </I18nextProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(controller.actions.retry).toHaveBeenCalledOnce();
    expect(controller.actions.recover).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Check same run' })).not.toBeInTheDocument();
  });

  it('offers only same-run recovery while active observation is paused', () => {
    const controller = fixture();
    controller.run.status = 'running';
    controller.run.observationExpired = true;
    controller.run.recoveryAvailable = true;

    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView
          controller={controller}
          isAdmin={false}
          onOpenProviders={vi.fn()}
          onOpenSchedules={vi.fn()}
        />
      </I18nextProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Check same run' }));
    expect(controller.actions.recover).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Start new run' })).not.toBeInTheDocument();
  });

  it('renders an indeterminate completion as a localized manual-check state without retry', () => {
    const controller = fixture();
    controller.sessions.items[0]!.status = 'RECOVERY_REQUIRED';
    controller.run.status = 'error';
    controller.run.errorMessage = 'Internal completion persistence detail';
    controller.run.recoveryRequired = true;
    controller.run.retryAvailable = false;

    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView
          controller={controller}
          isAdmin={false}
          onOpenProviders={vi.fn()}
          onOpenSchedules={vi.fn()}
        />
      </I18nextProvider>
    );

    expect(screen.getByRole('navigation', { name: 'Tasks' })).toHaveTextContent('Check required');
    const conversation = screen.getByRole('region', { name: 'Task' });
    expect(conversation).toHaveTextContent('Check required');
    expect(
      within(conversation)
        .getAllByRole('alert')
        .some(alert =>
          alert.textContent?.includes(
            'The tool may have completed, but HertzBeat could not save the result. Check the target before continuing.'
          )
        )
    ).toBe(true);
    expect(conversation).not.toHaveTextContent('Internal completion persistence detail');
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(screen.queryByText('RECOVERY_REQUIRED')).not.toBeInTheDocument();
  });

  it('renders target unavailability without exposing backend detail or offering retry', () => {
    const controller = fixture();
    controller.run.status = 'error';
    controller.run.targetFailure = 'unavailable';
    controller.run.errorMessage = 'Internal entity and warehouse detail';
    controller.run.retryAvailable = false;

    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView
          controller={controller}
          isAdmin={false}
          onOpenProviders={vi.fn()}
          onOpenSchedules={vi.fn()}
        />
      </I18nextProvider>
    );

    const conversation = screen.getByRole('region', { name: 'Task' });
    expect(conversation).toHaveTextContent('HertzBeat cannot verify this task target right now. No task was started.');
    expect(conversation).not.toHaveTextContent('Internal entity and warehouse detail');
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('localizes monitor and entity target labels outside English', async () => {
    await loadLocale('ja-JP');
    try {
      render(
        <I18nextProvider i18n={i18n}>
          <AgentWorkspaceView
            controller={fixture()}
            isAdmin={false}
            onOpenProviders={vi.fn()}
            onOpenSchedules={vi.fn()}
          />
        </I18nextProvider>
      );
      fireEvent.click(screen.getByRole('button', { name: i18n.t('aiWorkspace.context.open') }));
      const context = screen.getByRole('complementary', { name: i18n.t('aiWorkspace.context.label') });
      expect(context).toHaveTextContent(i18n.t('aiWorkspace.context.monitorTarget', { id: 42 }));
      expect(context).toHaveTextContent(i18n.t('aiWorkspace.context.entityTarget', { id: 73 }));
      expect(context).not.toHaveTextContent('Monitor 42');
      expect(context).not.toHaveTextContent('Entity 73');
    } finally {
      await loadLocale('en-US');
    }
  });

  it('renders only safe canonical single-alert metadata in run details', () => {
    const controller = fixture();
    controller.target = { version: 'single-alert.v1', alertId: 42, alertType: 'single' };

    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView
          controller={controller}
          isAdmin={false}
          onOpenProviders={vi.fn()}
          onOpenSchedules={vi.fn()}
        />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: i18n.t('aiWorkspace.context.open') }));
    const context = screen.getByRole('complementary', { name: i18n.t('aiWorkspace.context.label') });
    expect(context).toHaveTextContent(i18n.t('aiWorkspace.context.singleAlertTarget', { id: 42 }));
    expect(context).toHaveTextContent('single-alert.v1');
    expect(context).not.toHaveTextContent('sha256:');
    expect(context).not.toHaveTextContent('binding');
  });

  it('renders only safe canonical Entity metadata in run details', () => {
    const controller = fixture();
    controller.target = { version: 'entity.v1', entityId: 73 };

    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView
          controller={controller}
          isAdmin={false}
          onOpenProviders={vi.fn()}
          onOpenSchedules={vi.fn()}
        />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: i18n.t('aiWorkspace.context.open') }));
    const context = screen.getByRole('complementary', { name: i18n.t('aiWorkspace.context.label') });
    expect(context).toHaveTextContent(i18n.t('aiWorkspace.context.entityTarget', { id: 73 }));
    expect(context).toHaveTextContent('entity.v1');
    expect(context).not.toHaveTextContent('sha256:');
    expect(context).not.toHaveTextContent('binding');
  });

  it('renders only the safe canonical Topology scope in run details', () => {
    const controller = fixture();
    controller.target = {
      version: 'topology.v1',
      entityId: 10,
      topology: {
        rootEntityId: 10,
        nodeId: 'entity:10',
        depth: 2,
        environment: 'prod',
        sourceKind: 'otlp-trace-call',
        start: 1_000,
        end: 2_000,
        relationType: 'trace-call',
        hideInternal: true,
        pageIndex: 1,
        pageSize: 50
      }
    };

    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView
          controller={controller}
          isAdmin={false}
          onOpenProviders={vi.fn()}
          onOpenSchedules={vi.fn()}
        />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: i18n.t('aiWorkspace.context.open') }));
    const context = screen.getByRole('complementary', { name: i18n.t('aiWorkspace.context.label') });
    expect(context).toHaveTextContent(i18n.t('aiWorkspace.context.topologyTarget', { id: 10 }));
    expect(context).toHaveTextContent('entity:10');
    expect(context).toHaveTextContent('otlp-trace-call');
    expect(context).toHaveTextContent('trace-call');
    expect(context).toHaveTextContent('topology.v1');
    expect(context).not.toHaveTextContent('sha256:');
    expect(context).not.toHaveTextContent('binding');
  });

  it('renders only the safe canonical Trace scope in run details', () => {
    const controller = fixture();
    controller.target = {
      version: 'trace-detail.v1',
      trace: {
        traceId: 'trace-42',
        spanId: 'span-7',
        start: 1_000,
        end: 2_000,
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'prod',
        resourceFilter: 'service.version=1',
        attributeFilter: 'http.status_code=503',
        minDurationMs: 10,
        maxDurationMs: 20
      }
    };

    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView
          controller={controller}
          isAdmin={false}
          onOpenProviders={vi.fn()}
          onOpenSchedules={vi.fn()}
        />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: i18n.t('aiWorkspace.context.open') }));
    const context = screen.getByRole('complementary', { name: i18n.t('aiWorkspace.context.label') });
    expect(context).toHaveTextContent(i18n.t('aiWorkspace.context.traceTarget', { id: 'trace-42' }));
    expect(context).toHaveTextContent('span-7');
    expect(context).toHaveTextContent('checkout');
    expect(context).toHaveTextContent('commerce');
    expect(context).toHaveTextContent('prod');
    expect(context).toHaveTextContent('trace-detail.v1');
    expect(context).not.toHaveTextContent('sha256:');
    expect(context).not.toHaveTextContent('binding');
  });

  it('renders only the safe canonical Log page scope in run details', () => {
    const controller = fixture();
    controller.target = {
      version: 'log-page.v1',
      log: {
        start: 1_000,
        end: 2_000,
        traceId: 'trace-42',
        spanId: 'span-7',
        severityText: 'WARN',
        search: 'timeout',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'prod',
        resourceFilter: 'service.version=1',
        attributeFilter: 'http.status_code=503',
        hideInternal: true,
        hideNoise: false,
        pageIndex: 2,
        pageSize: 20
      }
    };

    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView
          controller={controller}
          isAdmin={false}
          onOpenProviders={vi.fn()}
          onOpenSchedules={vi.fn()}
        />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: i18n.t('aiWorkspace.context.open') }));
    const context = screen.getByRole('complementary', { name: i18n.t('aiWorkspace.context.label') });
    expect(context).toHaveTextContent(i18n.t('aiWorkspace.context.logTarget'));
    expect(context).toHaveTextContent('trace-42');
    expect(context).toHaveTextContent('span-7');
    expect(context).toHaveTextContent('WARN');
    expect(context).toHaveTextContent('timeout');
    expect(context).toHaveTextContent('checkout');
    expect(context).toHaveTextContent('log-page.v1');
    expect(context).not.toHaveTextContent('sha256:');
    expect(context).not.toHaveTextContent('binding');
  });

  it('disables sending and explains an invalid target-looking link', () => {
    const controller = fixture();
    controller.invalidTarget = true;
    controller.composer = 'Must not be sent without authority';
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView
          controller={controller}
          isAdmin={false}
          onOpenProviders={vi.fn()}
          onOpenSchedules={vi.fn()}
        />
      </I18nextProvider>
    );

    expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('aiWorkspace.invalidTarget'));
    expect(screen.getByRole('textbox', { name: i18n.t('aiWorkspace.composer.label') })).toBeDisabled();
    expect(screen.getByRole('button', { name: i18n.t('aiWorkspace.actions.send') })).toBeDisabled();
  });

  it('does not present a failed durable transcript load as an empty investigation', () => {
    const controller = fixture();
    controller.transcript = { status: 'error', items: [] };
    controller.run = {
      status: 'idle',
      messages: [],
      tools: [],
      approvals: [],
      inputs: [],
      recoveryAvailable: false,
      retryAvailable: false
    };
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView
          controller={controller}
          isAdmin={false}
          onOpenProviders={vi.fn()}
          onOpenSchedules={vi.fn()}
        />
      </I18nextProvider>
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Some saved task details could not be loaded. Refresh or select the task again.'
    );
    expect(screen.queryByText('What do you want to investigate?')).not.toBeInTheDocument();
  });
});

describe('Cancelled pending approval presentation', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);
  it('uses cancelled instead of failed for the exact persisted cancellation result', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceMessage
          message={{
            id: 42,
            role: 'toolResult',
            toolName: 'alert_inhibit.update',
            toolStatus: 'DENIED',
            text: 'Original raw evidence remains',
            errorMessage: 'CANCELLED_BEFORE_APPROVAL_NOT_EXECUTED'
          }}
        />
      </I18nextProvider>
    );
    expect(screen.getByText(i18n.t('aiWorkspace.context.cancelledBeforeExecution'))).toBeInTheDocument();
    expect(screen.queryByText(i18n.t('aiWorkspace.executionSummary.toolFailed'))).not.toBeInTheDocument();
    expect(screen.getByText('Original raw evidence remains')).toBeInTheDocument();
  });
  it('retains an actual historical failure message', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceMessage
          message={{
            id: 43,
            role: 'toolResult',
            toolName: 'alert_inhibit.update',
            toolStatus: 'FAILED',
            text: 'Original error',
            errorMessage: 'HTTP_403'
          }}
        />
      </I18nextProvider>
    );
    expect(screen.getByText(i18n.t('aiWorkspace.executionSummary.toolFailed'))).toBeInTheDocument();
    expect(screen.getByText('HTTP_403')).toBeInTheDocument();
  });
  it('shows cancellation without claiming partial completion or failed queries', () => {
    const summary = {
      status: 'PARTIAL' as const,
      totalAttempts: 3,
      succeededAttempts: 2,
      failedAttempts: 1,
      recoveredAttempts: 0,
      unresolvedAttempts: 1,
      unfinishedAttempts: 0,
      failures: [],
      truncated: false
    };
    render(
      <I18nextProvider i18n={i18n}>
        <AgentExecutionSummary summary={summary} cancelledBeforeApproval />
      </I18nextProvider>
    );
    expect(screen.getAllByText(i18n.t('aiWorkspace.context.cancelledBeforeExecution'))).toHaveLength(2);
    expect(screen.queryByText(i18n.t('aiWorkspace.executionSummary.compact.PARTIAL'))).not.toBeInTheDocument();
    expect(screen.queryByText(i18n.t('aiWorkspace.executionSummary.PARTIAL'))).not.toBeInTheDocument();
    expect(screen.queryByText(i18n.t('aiWorkspace.executionSummary.coverage'))).not.toBeInTheDocument();
  });
});

function fixture(): AgentWorkspaceViewModel {
  return {
    sessions: {
      status: 'ready' as const,
      items: [
        {
          id: 1,
          sessionUid: 'session-1',
          conversationId: 'conversation-1',
          status: 'NO_RUN',
          title: 'Checkout latency',
          gmtCreate: '2026-08-13T08:00:00',
          gmtUpdate: '2026-08-13T08:01:00'
        },
        {
          id: 2,
          sessionUid: 'session-2',
          conversationId: 'conversation-2',
          status: 'COMPLETED',
          title: 'Redis saturation',
          gmtCreate: '2026-08-12T08:00:00',
          gmtUpdate: '2026-08-12T09:30:00'
        }
      ]
    },
    selectedSessionUid: 'session-1',
    transcript: {
      status: 'ready' as const,
      items: [
        {
          id: 1,
          sequence: 1,
          role: 'user' as const,
          text: 'Why is checkout slow?',
          createdAt: '2026-08-13T08:00:00'
        },
        {
          id: 2,
          sequence: 2,
          role: 'toolResult' as const,
          text: 'Monitor 73 was read.',
          toolName: 'monitor.get',
          createdAt: '2026-08-13T08:00:02'
        }
      ]
    },
    draftMessages: [] as { id: string; role: 'user'; text: string }[],
    run: {
      runUid: 'run-1',
      status: 'error' as const,
      messages: [{ id: 'message-1', text: 'The latency increase starts', status: 'streaming' as const }],
      tools: [
        { toolCallId: 'tool-1', toolName: 'metrics.query', status: 'SUCCEEDED' },
        {
          toolCallId: 'tool-3',
          toolName: 'metrics.history',
          status: 'FAILED',
          errorMessage: 'Metrics warehouse unavailable'
        }
      ],
      approvals: [
        {
          approvalId: 'approval-1',
          canDecide: true,
          toolCallId: 'tool-2',
          toolName: 'monitor.disable',
          status: 'PENDING'
        }
      ],
      inputs: [],
      errorMessage: 'The investigation requires a successful data read.',
      recoveryAvailable: false,
      retryAvailable: false
    },
    target: {
      version: 'entity-monitor-metric.v1',
      entityId: 73,
      monitorId: 42,
      service: { name: 'checkout-db', namespace: 'database', environment: 'production' },
      signal: {
        type: 'metrics',
        query: 'basic.max_connections',
        start: 200_000,
        end: 2_000_000,
        timezone: 'Asia/Shanghai'
      }
    },
    invalidTarget: false,
    composer: '',
    streaming: false,
    stopping: false,
    actions: {
      selectSession: vi.fn(),
      newInvestigation: vi.fn(),
      setComposer: vi.fn(),
      send: vi.fn(),
      stop: vi.fn(),
      retry: vi.fn(),
      recover: vi.fn(),
      decideApproval: vi.fn(),
      submitInteraction: vi.fn()
    }
  };
}
