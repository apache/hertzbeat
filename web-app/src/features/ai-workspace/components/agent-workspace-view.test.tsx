/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { AgentWorkspaceView } from './agent-workspace-view';

describe('AgentWorkspaceView', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('keeps investigation history, the streamed answer, and exact action review in separate regions', () => {
    const controller = fixture();
    const view = render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView controller={controller} isAdmin onOpenProviders={vi.fn()} />
      </I18nextProvider>
    );

    expect(screen.getByRole('navigation', { name: 'Investigations' })).toHaveTextContent('Checkout latency');
    const conversation = screen.getByRole('region', { name: 'Investigation' });
    expect(conversation).toHaveTextContent('Why is checkout slow?');
    expect(conversation).toHaveTextContent('The latency increase starts');
    const context = screen.getByRole('complementary', { name: 'Run context' });
    expect(context).toHaveTextContent('Entity 73');
    expect(context).toHaveTextContent('monitor.disable');
    expect(within(context).getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(within(context).getByRole('button', { name: 'Reject' })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Investigation prompt' }), {
      target: { value: 'Check database waits' }
    });
    view.rerender(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView
          controller={{ ...controller, composer: 'Check database waits' }}
          isAdmin
          onOpenProviders={vi.fn()}
        />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(controller.actions.setComposer).toHaveBeenCalledWith('Check database waits');
    expect(controller.actions.send).toHaveBeenCalledOnce();
  });
});

function fixture() {
  return {
    sessions: {
      status: 'ready' as const,
      items: [
        {
          id: 1,
          sessionUid: 'session-1',
          conversationId: 'conversation-1',
          status: 'ACTIVE',
          title: 'Checkout latency',
          gmtCreate: '2026-08-13T08:00:00',
          gmtUpdate: '2026-08-13T08:01:00'
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
        }
      ]
    },
    draftMessages: [] as { id: string; role: 'user'; text: string }[],
    run: {
      runUid: 'run-1',
      status: 'running' as const,
      messages: [{ id: 'message-1', text: 'The latency increase starts', status: 'streaming' as const }],
      tools: [{ toolCallId: 'tool-1', toolName: 'metrics.query', status: 'SUCCEEDED' }],
      approvals: [
        {
          approvalId: 'approval-1',
          toolCallId: 'tool-2',
          toolName: 'monitor.disable',
          status: 'PENDING'
        }
      ],
      inputs: []
    },
    target: { entityId: 73 },
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
      decideApproval: vi.fn(),
      submitInteraction: vi.fn()
    }
  };
}
