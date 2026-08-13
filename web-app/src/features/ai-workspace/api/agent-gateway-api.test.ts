/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  activateAgentProvider,
  createAgentProvider,
  deleteAgentProvider,
  listAgentProviderConfigurations,
  listAgentProviderOptions,
  streamAgentChat
} from './agent-gateway-api';

describe('Agent Gateway browser API', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts a long-lived authenticated stream and parses events split across chunks', async () => {
    document.cookie = 'hb_ui_csrf=agent-csrf; path=/';
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        streamingResponse([
          'event: run_started\nid: event-1\ndata: {"type":"RUN_STARTED","eventId":"event-1","conversationId":"conversation-1",',
          '"sessionUid":"session-1","runUid":"run-1","itemId":null,"payload":{"traceId":"trace-1"},"timestamp":1}\n\n',
          'event: message_delta\ndata: {"type":"MESSAGE_DELTA","eventId":"event-2","conversationId":"conversation-1","sessionUid":"session-1","runUid":"run-1","itemId":"message-1","payload":{"traceId":"trace-1","deltaIndex":0,"delta":"hello"},"timestamp":2}\n\n'
        ])
      );
    vi.stubGlobal('fetch', fetchMock);
    const events: string[] = [];

    await streamAgentChat(
      {
        conversationId: 'conversation-1',
        messageId: 'message-1',
        message: 'Inspect checkout',
        target: { entityId: 9 },
        attachments: []
      },
      event => events.push(event.type),
      { language: 'en-US' }
    );

    expect(events).toEqual(['RUN_STARTED', 'MESSAGE_DELTA']);
    expect(fetchMock).toHaveBeenCalledOnce();
    const init = fetchMock.mock.calls[0]?.[1];
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/agent/webui/chat/stream');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers)).toMatchObject(expect.any(Headers));
    expect(new Headers(init?.headers).get('Accept')).toBe('text/event-stream');
    expect(new Headers(init?.headers).get('Accept-Language')).toBe('en-US');
    expect(new Headers(init?.headers).get('X-HertzBeat-CSRF')).toBe('agent-csrf');
    const body = typeof init?.body === 'string' ? init.body : '';
    expect(JSON.parse(body)).toMatchObject({ target: { entityId: 9 } });
  });

  it('uses the exact administrative provider endpoints without returning an API key', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(message([{ type: 'openai-compatible', code: 'openai', label: 'OpenAI' }]))
      .mockResolvedValueOnce(message({ activeProviderUid: null, providers: [] }))
      .mockResolvedValueOnce(
        message({
          activeProviderUid: 'provider-1',
          providers: [
            {
              uid: 'provider-1',
              type: 'openai-compatible',
              code: 'openai',
              baseUrl: 'https://example.invalid',
              model: 'model-1',
              apiKeyConfigured: true
            }
          ]
        })
      )
      .mockResolvedValueOnce(message({ activeProviderUid: 'provider-1', providers: [] }))
      .mockResolvedValueOnce(message({ activeProviderUid: null, providers: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await listAgentProviderOptions();
    await listAgentProviderConfigurations();
    const created = await createAgentProvider({
      type: 'openai-compatible',
      code: 'openai',
      baseUrl: 'https://example.invalid',
      model: 'model-1',
      apiKey: 'private-input'
    });
    await activateAgentProvider('provider-1');
    await deleteAgentProvider('provider-1');

    expect(created.providers[0]).not.toHaveProperty('apiKey');
    expect(fetchMock.mock.calls.map(call => [call[0], call[1]?.method ?? 'GET'])).toEqual([
      ['/api/agent/model-providers/options', 'GET'],
      ['/api/agent/model-providers/configurations', 'GET'],
      ['/api/agent/model-providers/configurations', 'POST'],
      ['/api/agent/model-providers/active/provider-1', 'PUT'],
      ['/api/agent/model-providers/configurations/provider-1', 'DELETE']
    ]);
  });
});

function streamingResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)));
        controller.close();
      }
    }),
    { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
  );
}

function message(data: unknown) {
  return new Response(JSON.stringify({ code: 0, msg: null, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
