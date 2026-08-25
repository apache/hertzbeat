/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import { AgentWorkspaceView } from './agent-workspace-view';

describe('AgentWorkspaceView', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('keeps the conversation primary and opens run details only when requested', () => {
    const controller = fixture();
    const openSchedules = vi.fn();
    const view = render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceView controller={controller} isAdmin onOpenProviders={vi.fn()} onOpenSchedules={openSchedules} />
      </I18nextProvider>
    );

    expect(screen.getByRole('navigation', { name: 'Investigations' })).toHaveTextContent('Checkout latency');
    expect(screen.getByRole('navigation', { name: 'Investigations' })).toHaveTextContent('No runs');
    const conversation = screen.getByRole('region', { name: 'Investigation' });
    expect(within(conversation).getByRole('heading', { level: 2, name: 'Checkout latency' })).toBeInTheDocument();
    expect(conversation).toHaveTextContent('Why is checkout slow?');
    expect(conversation).toHaveTextContent('monitor.get');
    expect(conversation).toHaveTextContent('Monitor 73 was read.');
    expect(conversation).toHaveTextContent('The investigation requires a successful data read.');
    expect(conversation).toHaveTextContent('The latency increase starts');
    expect(within(conversation).getByRole('button', { name: 'metrics.query' })).toHaveTextContent('SUCCEEDED');
    expect(screen.queryByRole('complementary', { name: 'Run context' })).not.toBeInTheDocument();
    fireEvent.click(within(conversation).getByRole('button', { name: 'metrics.query' }));
    expect(screen.getByRole('complementary', { name: 'Run context' })).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: 'Scheduled investigations' }));
    expect(openSchedules).toHaveBeenCalledOnce();

    fireEvent.change(screen.getByRole('textbox', { name: 'Investigation prompt' }), {
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

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search investigations' }), {
      target: { value: 'Redis' }
    });
    const sessions = screen.getByRole('navigation', { name: 'Investigations' });
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

    expect(screen.getByRole('navigation', { name: 'Investigations' })).toHaveTextContent('Cancelled');
    expect(screen.getByRole('region', { name: 'Investigation' })).toHaveTextContent('Cancelled');
    expect(screen.queryByText('CANCELLED')).not.toBeInTheDocument();
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

    expect(screen.getByRole('navigation', { name: 'Investigations' })).toHaveTextContent('Check required');
    const conversation = screen.getByRole('region', { name: 'Investigation' });
    expect(conversation).toHaveTextContent('Check required');
    expect(within(conversation).getByRole('alert')).toHaveTextContent(
      'The tool may have completed, but HertzBeat could not save the result. Check the target before continuing.'
    );
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

    const conversation = screen.getByRole('region', { name: 'Investigation' });
    expect(conversation).toHaveTextContent(
      'HertzBeat cannot verify this investigation target right now. No investigation was started.'
    );
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
      'Some saved investigation details could not be loaded. Refresh or select the investigation again.'
    );
    expect(screen.queryByText('What do you want to investigate?')).not.toBeInTheDocument();
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
