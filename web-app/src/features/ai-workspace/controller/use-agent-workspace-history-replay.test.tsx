/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { AgentWorkspaceView } from '../components/agent-workspace-view';
import conversationStyles from '../components/agent-workspace-conversation.module.css?raw';
import { useAgentWorkspaceController } from './use-agent-workspace-controller';

function Harness() {
  const controller = useAgentWorkspaceController();
  return (
    <I18nextProvider i18n={i18n}>
      <AgentWorkspaceView controller={controller} isAdmin onOpenProviders={vi.fn()} onOpenSchedules={vi.fn()} />
    </I18nextProvider>
  );
}

describe('AI workspace durable history through the API adapter', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('reopens persisted tool calls/results without empty assistant articles or false live status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.includes('/transcript?')) return Promise.resolve(message(page(transcriptEntries())));
        if (url.endsWith('/latest-run')) return Promise.resolve(message(snapshot()));
        if (url.startsWith('/api/agent/sessions?')) return Promise.resolve(message(page([session()])));
        throw new Error(`Unexpected request: ${url}`);
      })
    );
    render(<Harness />);
    fireEvent.click(await screen.findByRole('button', { name: /Recorded log investigation/ }));
    await screen.findByText('The bounded query returned one redacted record.');
    fireEvent.click(screen.getByRole('button', { name: 'Open run details' }));
    const rail = screen.getByRole('complementary', { name: 'Run context' });
    expect(rail).toHaveTextContent('tool.search');
    expect(rail).toHaveTextContent('logs.query');
    expect(within(rail).getAllByText(i18n.t('aiWorkspace.context.statusUnknown'))).toHaveLength(2);
    expect(rail).not.toHaveTextContent('No tools used yet');
    expect(rail).not.toHaveTextContent('SUCCEEDED');
    expect(rail).not.toHaveTextContent(' ms');
    const conversation = screen.getByRole('region', { name: 'Investigation' });
    expect(conversation.querySelectorAll('article[data-role="assistant"]')).toHaveLength(1);
    expect(conversation).toHaveTextContent('{"content":["password=[REDACTED]"]}');
    expect(within(conversation).getByRole('button', { name: 'logs.query' })).toHaveTextContent(
      i18n.t('aiWorkspace.context.statusUnknown')
    );
  });

  it('keeps indentation and horizontal padding proportional to the available conversation', () => {
    const user = conversationStyles.match(/\.message\[data-role='user'\]\s*\{([^}]+)\}/)?.[1];
    expect(user).toMatch(/padding-left:\s*min\(\d+%,\s*\d+px\)/);
    expect(user).not.toMatch(/\d+(?:\.\d+)?vw/);
    expect(conversationStyles).toMatch(/\.transcript\s*\{[^}]*overflow:\s*auto/s);
    expect(conversationStyles).toMatch(/\.messageText\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  });
});

function message(data: unknown) {
  return Response.json({ code: 0, data });
}
function page(content: unknown[]) {
  return { content, totalElements: content.length, totalPages: 1, number: 0, size: 200 };
}
function session() {
  return {
    id: 1,
    sessionUid: 'session-1',
    conversationId: 'conversation-1',
    status: 'SUCCEEDED',
    title: 'Recorded log investigation',
    gmtCreate: null,
    gmtUpdate: null
  };
}
function snapshot() {
  return {
    runUid: 'run-1',
    sessionUid: 'session-1',
    messageId: 'message-1',
    status: 'SUCCEEDED',
    target: null,
    result: 'The bounded query returned one redacted record.',
    errorMessage: null,
    replayAvailable: true,
    startedAt: null,
    completedAt: null,
    retryRequest: null
  };
}
function transcriptEntries() {
  const payloads = [
    { role: 'user', content: [{ type: 'text', text: 'Inspect the bounded log page.' }] },
    {
      role: 'assistant',
      content: [{ type: 'toolCall', id: 'call-1', name: 'tool.search', input: { namespace: 'logs' } }]
    },
    {
      role: 'toolResult',
      toolCallId: 'call-1',
      toolName: 'tool.search',
      content: [{ type: 'text', text: '{"tools":["logs.query"]}' }],
      errorMessage: ''
    },
    {
      role: 'assistant',
      content: [{ type: 'toolCall', id: 'call-2', name: 'logs.query', input: { start: 1000, end: 2000 } }]
    },
    {
      role: 'toolResult',
      toolCallId: 'call-2',
      toolName: 'logs.query',
      content: [{ type: 'text', text: '{"content":["password=[REDACTED]"]}' }],
      errorMessage: ''
    },
    { role: 'assistant', content: [{ type: 'text', text: snapshot().result }] }
  ];
  return payloads.map((payload, index) => ({
    id: index + 1,
    sessionSequence: index + 1,
    payloadJson: JSON.stringify(payload),
    messageRole: payload.role,
    gmtCreate: null
  }));
}
