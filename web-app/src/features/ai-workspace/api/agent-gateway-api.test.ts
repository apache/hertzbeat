/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  activateAgentProvider,
  createAgentProvider,
  deleteAgentProvider,
  getAgentRun,
  getLatestAgentRun,
  listAgentProviderConfigurations,
  listAgentProviderOptions,
  listAgentTranscript,
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
        preferredLanguage: 'ja-JP',
        target: {
          monitorId: 42,
          signal: {
            type: 'metrics',
            query: 'basic.max_connections',
            start: 200_000,
            end: 2_000_000,
            timezone: 'Asia/Shanghai'
          },
          entityId: 73,
          version: 'forged',
          authority: { hash: 'secret' },
          returnTo: '/private'
        } as never,
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
    expect(new Headers(init?.headers).get('Accept-Language')).toBe('ja-JP');
    expect(new Headers(init?.headers).get('X-HertzBeat-CSRF')).toBe('agent-csrf');
    const body = typeof init?.body === 'string' ? init.body : '';
    expect(JSON.parse(body)).toMatchObject({
      target: {
        monitorId: 42,
        signal: {
          type: 'metrics',
          query: 'basic.max_connections',
          start: 200_000,
          end: 2_000_000,
          timezone: 'Asia/Shanghai'
        }
      }
    });
    expect(JSON.parse(body)).not.toHaveProperty('preferredLanguage');
    expect(JSON.parse(body).target).not.toHaveProperty('entityId');
    expect(JSON.parse(body).target).not.toHaveProperty('version');
    expect(JSON.parse(body).target).not.toHaveProperty('authority');
    expect(JSON.parse(body).target).not.toHaveProperty('returnTo');
  });

  it('posts only a typed single-alert source intent and strips forged canonical fields', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(streamingResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    await streamAgentChat(
      {
        conversationId: 'conversation-alert',
        messageId: 'message-alert',
        message: 'Inspect this alert',
        target: {
          alertId: 42,
          alertType: 'single',
          version: 'forged',
          authority: { hash: 'private' },
          workspaceId: 'foreign',
          returnTo: '/private'
        } as never,
        attachments: []
      },
      vi.fn()
    );

    const init = fetchMock.mock.calls[0]?.[1];
    const body = JSON.parse(typeof init?.body === 'string' ? init.body : '');
    expect(body.target).toEqual({ alertId: 42, alertType: 'single' });
    expect(body.target).not.toHaveProperty('version');
    expect(body.target).not.toHaveProperty('authority');
    expect(body.target).not.toHaveProperty('workspaceId');
    expect(body.target).not.toHaveProperty('returnTo');
  });

  it('posts only a typed Entity source intent and strips forged canonical fields', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(streamingResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    await streamAgentChat(
      {
        conversationId: 'conversation-entity',
        messageId: 'message-entity',
        message: 'Inspect this entity',
        target: {
          entityId: 73,
          version: 'forged',
          authority: { hash: 'private' },
          workspaceId: 'foreign',
          returnTo: '/private'
        } as never,
        attachments: []
      },
      vi.fn()
    );

    const init = fetchMock.mock.calls[0]?.[1];
    const body = JSON.parse(typeof init?.body === 'string' ? init.body : '');
    expect(body.target).toEqual({ entityId: 73 });
    expect(body.target).not.toHaveProperty('version');
    expect(body.target).not.toHaveProperty('authority');
    expect(body.target).not.toHaveProperty('workspaceId');
    expect(body.target).not.toHaveProperty('returnTo');
  });

  it('posts only a typed Topology source scope and strips forged canonical fields', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(streamingResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    await streamAgentChat(
      {
        conversationId: 'conversation-topology',
        messageId: 'message-topology',
        message: 'Inspect this graph',
        target: {
          topology: topologyScope(),
          version: 'forged',
          entityId: 10,
          authority: { hash: 'private' },
          workspaceId: 'foreign',
          returnTo: '/private'
        } as never,
        attachments: []
      },
      vi.fn()
    );

    const init = fetchMock.mock.calls[0]?.[1];
    const body = JSON.parse(typeof init?.body === 'string' ? init.body : '');
    expect(body.target).toEqual({ topology: sourceTopologyScope() });
    expect(body.target).not.toHaveProperty('version');
    expect(body.target).not.toHaveProperty('entityId');
    expect(body.target).not.toHaveProperty('authority');
    expect(body.target).not.toHaveProperty('workspaceId');
    expect(body.target).not.toHaveProperty('returnTo');
  });

  it('posts only a typed Trace source scope and strips forged canonical fields', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(streamingResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    await streamAgentChat(
      {
        conversationId: 'conversation-trace',
        messageId: 'message-trace',
        message: 'Inspect this trace',
        target: {
          trace: traceScope(),
          version: 'forged',
          authority: { hash: 'private' },
          workspaceId: 'foreign',
          returnTo: '/private'
        } as never,
        attachments: []
      },
      vi.fn()
    );

    const init = fetchMock.mock.calls[0]?.[1];
    const body = JSON.parse(typeof init?.body === 'string' ? init.body : '');
    expect(body.target).toEqual({ trace: sourceTraceScope() });
    expect(body.target).not.toHaveProperty('version');
    expect(body.target).not.toHaveProperty('authority');
    expect(body.target).not.toHaveProperty('workspaceId');
    expect(body.target).not.toHaveProperty('returnTo');
  });

  it('posts only a typed Log source scope and strips forged canonical fields', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(streamingResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    await streamAgentChat(
      {
        conversationId: 'conversation-log',
        messageId: 'message-log',
        message: 'Inspect this log page',
        target: {
          log: logScope(),
          version: 'forged',
          authority: { hash: 'private' },
          workspaceId: 'foreign',
          returnTo: '/private'
        } as never,
        attachments: []
      },
      vi.fn()
    );

    const init = fetchMock.mock.calls[0]?.[1];
    const body = JSON.parse(typeof init?.body === 'string' ? init.body : '');
    expect(body.target).toEqual({ log: sourceLogScope() });
    expect(body.target).not.toHaveProperty('version');
    expect(body.target).not.toHaveProperty('authority');
    expect(body.target).not.toHaveProperty('workspaceId');
    expect(body.target).not.toHaveProperty('returnTo');
  });

  it('loads a canonical single-alert target safely and keeps retry source-only', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      message({
        runUid: 'run-alert',
        sessionUid: 'session-alert',
        messageId: 'message-alert',
        status: 'FAILED',
        target: fullCanonicalAlertTarget(),
        result: null,
        errorMessage: 'Alert unavailable',
        replayAvailable: true,
        startedAt: null,
        completedAt: '2026-08-15T10:00:00',
        retryRequest: {
          conversationId: 'conversation-alert',
          messageId: 'message-alert',
          message: 'Inspect this alert',
          target: fullSourceAlertTarget(),
          attachments: [],
          preferredLanguage: 'en-US'
        }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const snapshot = await getLatestAgentRun('session-alert');

    expect(snapshot?.target).toEqual({ version: 'single-alert.v1', alertId: 42, alertType: 'single' });
    expect(snapshot?.target).not.toHaveProperty('authority');
    expect(snapshot?.retryRequest?.target).toEqual({ alertId: 42, alertType: 'single' });
  });

  it('loads a canonical Entity target safely and keeps retry source-only', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      message({
        runUid: 'run-entity',
        sessionUid: 'session-entity',
        messageId: 'message-entity',
        status: 'FAILED',
        target: {
          version: 'entity.v1',
          monitorId: null,
          alertId: null,
          alertType: null,
          entityId: 73,
          collector: null,
          signal: null,
          topology: null,
          service: null,
          authority: { bindingId: 73, version: 'entity-authority.v1', hash: `sha256:${'a'.repeat(64)}` }
        },
        result: null,
        errorMessage: 'Entity unavailable',
        replayAvailable: true,
        startedAt: null,
        completedAt: '2026-08-15T10:00:00',
        retryRequest: {
          conversationId: 'conversation-entity',
          messageId: 'message-entity',
          message: 'Inspect this entity',
          target: {
            version: null,
            monitorId: null,
            alertId: null,
            alertType: null,
            entityId: 73,
            collector: null,
            signal: null,
            topology: null,
            service: null,
            authority: null
          },
          attachments: [],
          preferredLanguage: 'en-US'
        }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const snapshot = await getLatestAgentRun('session-entity');

    expect(snapshot?.target).toEqual({ version: 'entity.v1', entityId: 73 });
    expect(snapshot?.target).not.toHaveProperty('authority');
    expect(snapshot?.retryRequest?.target).toEqual({ entityId: 73 });
  });

  it('loads a canonical Topology target safely and keeps retry source-only', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      message({
        runUid: 'run-topology',
        sessionUid: 'session-topology',
        messageId: 'message-topology',
        status: 'FAILED',
        target: fullCanonicalTopologyTarget(),
        result: null,
        errorMessage: 'Topology unavailable',
        replayAvailable: true,
        startedAt: null,
        completedAt: '2026-08-16T10:00:00',
        retryRequest: {
          conversationId: 'conversation-topology',
          messageId: 'message-topology',
          message: 'Inspect this graph',
          target: fullSourceTopologyTarget(),
          attachments: [],
          preferredLanguage: 'en-US'
        }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const snapshot = await getLatestAgentRun('session-topology');

    expect(snapshot?.target).toEqual({ version: 'topology.v1', entityId: 10, topology: sourceTopologyScope() });
    expect(snapshot?.target).not.toHaveProperty('authority');
    expect(snapshot?.retryRequest?.target).toEqual({ topology: sourceTopologyScope() });
  });

  it('loads a canonical Trace target safely and keeps retry source-only', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      message({
        runUid: 'run-trace',
        sessionUid: 'session-trace',
        messageId: 'message-trace',
        status: 'FAILED',
        target: fullCanonicalTraceTarget(),
        result: null,
        errorMessage: 'Trace unavailable',
        replayAvailable: true,
        startedAt: null,
        completedAt: '2026-08-16T10:00:00',
        retryRequest: {
          conversationId: 'conversation-trace',
          messageId: 'message-trace',
          message: 'Inspect this trace',
          target: fullSourceTraceTarget(),
          attachments: [],
          preferredLanguage: 'en-US'
        }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const snapshot = await getLatestAgentRun('session-trace');

    expect(snapshot?.target).toEqual({ version: 'trace-detail.v1', trace: sourceTraceScope() });
    expect(snapshot?.target).not.toHaveProperty('authority');
    expect(snapshot?.retryRequest?.target).toEqual({ trace: sourceTraceScope() });
  });

  it('loads a canonical Log target safely and keeps retry source-only', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      message({
        runUid: 'run-log',
        sessionUid: 'session-log',
        messageId: 'message-log',
        status: 'FAILED',
        target: fullCanonicalLogTarget(),
        result: null,
        errorMessage: 'Logs unavailable',
        replayAvailable: true,
        startedAt: null,
        completedAt: '2026-08-16T10:00:00',
        retryRequest: {
          conversationId: 'conversation-log',
          messageId: 'message-log',
          message: 'Inspect this log page',
          target: fullSourceLogTarget(),
          attachments: [],
          preferredLanguage: 'en-US'
        }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const snapshot = await getLatestAgentRun('session-log');

    expect(snapshot?.target).toEqual({ version: 'log-page.v1', log: sourceLogScope() });
    expect(snapshot?.target).not.toHaveProperty('authority');
    expect(snapshot?.retryRequest?.target).toEqual({ log: sourceLogScope() });
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

  it('loads an exact durable run snapshot from the owner-scoped endpoint', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      message({
        runUid: 'run-1',
        sessionUid: 'session-1',
        messageId: 'message-1',
        status: 'FAILED',
        target: {
          version: 'entity-monitor-metric.v1',
          entityId: 73,
          monitorId: 42,
          service: { name: 'mysql-primary', namespace: 'database', environment: 'production' },
          signal: {
            type: 'metrics',
            query: 'basic.max_connections',
            start: 200_000,
            end: 2_000_000,
            timezone: 'Asia/Shanghai'
          },
          authority: { bindingId: 9, version: 'v1', hash: 'private-authority-hash' }
        },
        result: null,
        errorMessage: 'Warehouse unavailable',
        replayAvailable: true,
        startedAt: null,
        completedAt: '2026-08-14T11:00:00',
        retryRequest: {
          conversationId: 'conversation-1',
          messageId: 'message-1',
          message: 'Inspect checkout',
          target: {
            monitorId: 42,
            signal: {
              type: 'metrics',
              query: 'basic.max_connections',
              start: 200_000,
              end: 2_000_000,
              timezone: 'Asia/Shanghai'
            }
          },
          attachments: ['artifact-a'],
          preferredLanguage: 'ja-JP'
        }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const snapshot = await getAgentRun('run-1');
    expect(snapshot).toMatchObject({
      runUid: 'run-1',
      status: 'FAILED',
      target: {
        version: 'entity-monitor-metric.v1',
        entityId: 73,
        service: { name: 'mysql-primary' }
      },
      retryRequest: { message: 'Inspect checkout', preferredLanguage: 'ja-JP' }
    });
    expect(snapshot.target).not.toHaveProperty('authority');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/agent/runs/run-1');
  });

  it('loads the latest durable run through its owner-scoped session endpoint', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(message(null));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getLatestAgentRun('session-1')).resolves.toBeNull();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/agent/sessions/session-1/latest-run');
  });

  it('parses the current durable USER transcript and full canonical failed-run wire shape', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        message({
          content: [
            {
              id: 1,
              sessionSequence: 1,
              messageRole: 'user',
              payloadJson: JSON.stringify({
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Inspect response time',
                    id: null,
                    name: null,
                    input: {},
                    toolCall: false
                  }
                ],
                toolCallId: null,
                toolName: null,
                errorMessage: '',
                requestSnapshot: { version: '1' }
              }),
              gmtCreate: '2026-08-15T04:21:33.436546'
            }
          ],
          number: 0,
          size: 200,
          totalElements: 1,
          totalPages: 1
        })
      )
      .mockResolvedValueOnce(
        message({
          runUid: 'run-1',
          sessionUid: 'session-1',
          messageId: 'message-1',
          status: 'FAILED',
          target: fullCanonicalTarget(),
          result: null,
          errorMessage: 'Runtime model returned no response.',
          replayAvailable: true,
          startedAt: '2026-08-15T04:21:33.438437',
          completedAt: '2026-08-15T04:21:33.504973',
          retryRequest: {
            conversationId: 'conversation-1',
            messageId: 'message-1',
            message: 'Inspect response time',
            target: fullSourceTarget(),
            attachments: [],
            preferredLanguage: 'zh-CN'
          }
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(listAgentTranscript('session-1')).resolves.toEqual([
      expect.objectContaining({ id: 1, role: 'user', text: 'Inspect response time' })
    ]);
    const snapshot = await getLatestAgentRun('session-1');
    expect(snapshot).toMatchObject({
      status: 'FAILED',
      errorMessage: 'Runtime model returned no response.',
      target: { version: 'entity-monitor-metric.v1', entityId: 73, monitorId: 42 },
      retryRequest: {
        message: 'Inspect response time',
        target: { monitorId: 42, signal: { query: 'summary.responseTime' } }
      }
    });
    expect(snapshot?.target).not.toHaveProperty('authority');
    expect(snapshot?.retryRequest?.target).not.toHaveProperty('entityId');
  });
});

function fullCanonicalTarget() {
  return {
    version: 'entity-monitor-metric.v1',
    monitorId: 42,
    alertId: null,
    entityId: 73,
    collector: null,
    signal: {
      type: 'metrics',
      query: 'summary.responseTime',
      timeRange: null,
      start: 200_000,
      end: 2_000_000,
      timezone: 'Asia/Shanghai'
    },
    topology: null,
    service: { name: 'mysql-primary', namespace: null, environment: null },
    authority: { bindingId: 9, version: 'v1', hash: 'private-authority-hash' }
  };
}

function topologyScope() {
  return {
    rootEntityId: 10,
    nodeId: 'entity:10',
    edgeId: null,
    depth: 2,
    environment: 'prod',
    sourceKind: 'otlp-trace-call',
    start: 1_000,
    end: 2_000,
    relationType: 'trace-call',
    hideInternal: true,
    pageIndex: 1,
    pageSize: 50
  };
}

function sourceTopologyScope() {
  return Object.fromEntries(Object.entries(topologyScope()).filter(([key]) => key !== 'edgeId'));
}

function fullCanonicalTopologyTarget() {
  return {
    version: 'topology.v1',
    monitorId: null,
    alertId: null,
    alertType: null,
    entityId: 10,
    collector: null,
    signal: null,
    topology: topologyScope(),
    service: null,
    authority: { bindingId: 10, version: 'topology-authority.v1', hash: `sha256:${'a'.repeat(64)}` }
  };
}

function fullSourceTopologyTarget() {
  return { ...fullCanonicalTopologyTarget(), version: null, entityId: null, authority: null };
}

function traceScope() {
  return {
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
  };
}

function sourceTraceScope() {
  return traceScope();
}

function fullCanonicalTraceTarget() {
  return {
    version: 'trace-detail.v1',
    monitorId: null,
    alertId: null,
    alertType: null,
    entityId: null,
    collector: null,
    signal: null,
    topology: null,
    trace: traceScope(),
    service: null,
    authority: { bindingId: null, version: 'trace-detail-authority.v1', hash: `sha256:${'a'.repeat(64)}` }
  };
}

function fullSourceTraceTarget() {
  return { ...fullCanonicalTraceTarget(), version: null, authority: null };
}

function logScope() {
  return {
    start: 1_000,
    end: 2_000,
    traceId: 'trace-42',
    spanId: 'span-7',
    severityNumber: 13,
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
  };
}

function sourceLogScope() {
  return logScope();
}

function fullCanonicalLogTarget() {
  return {
    version: 'log-page.v1',
    monitorId: null,
    alertId: null,
    alertType: null,
    entityId: null,
    collector: null,
    signal: null,
    topology: null,
    trace: null,
    log: logScope(),
    service: null,
    authority: { bindingId: null, version: 'log-page-authority.v1', hash: `sha256:${'a'.repeat(64)}` }
  };
}

function fullSourceLogTarget() {
  return { ...fullCanonicalLogTarget(), version: null, authority: null };
}

function fullSourceTarget() {
  return {
    ...fullCanonicalTarget(),
    version: null,
    entityId: null,
    service: null,
    authority: null
  };
}

function fullCanonicalAlertTarget() {
  return {
    version: 'single-alert.v1',
    monitorId: null,
    alertId: 42,
    alertType: 'single',
    entityId: null,
    collector: null,
    signal: null,
    topology: null,
    service: null,
    authority: { bindingId: 42, version: 'single-alert-authority.v1', hash: `sha256:${'a'.repeat(64)}` }
  };
}

function fullSourceAlertTarget() {
  return { ...fullCanonicalAlertTarget(), version: null, authority: null };
}

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
