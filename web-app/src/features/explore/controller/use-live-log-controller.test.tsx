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

import { act, renderHook } from '@testing-library/react';
import { useLayoutEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UiSession } from '@/core/auth/session-api';

import type { LogExploreQuery } from '../model/explore-model';
import { useLiveLogController } from './use-live-log-controller';

const api = vi.hoisted(() => ({ buildLogStreamPath: vi.fn(), openLogStream: vi.fn() }));
const auth = vi.hoisted(() => ({
  state: {
    session: undefined as UiSession | undefined,
    loading: false,
    retry: vi.fn()
  }
}));
vi.mock('../api/explore-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/explore-api')>()),
  ...api
}));
vi.mock('@/core/auth/session-context', () => ({ useSession: () => auth.state }));

describe('Live Log controller', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    FakeSource.instances = [];
    auth.state.session = authenticatedSession();
    api.buildLogStreamPath.mockImplementation((query: LogExploreQuery) => `/stream?query=${query.query ?? ''}`);
    api.openLogStream.mockImplementation((_path: string, handlers: FakeHandlers) => new FakeSource(handlers));
  });
  afterEach(() => vi.useRealTimers());

  it('closes the old stream and drops late rows when switching telemetry source', () => {
    api.buildLogStreamPath.mockImplementation(
      (query: LogExploreQuery) => `/stream?source=${query.source ?? 'external'}`
    );
    const view = renderLive(query());
    const old = FakeSource.instances[0]!;
    act(() => old.event(logRow('external')));
    expect(view.result.current.rows).toHaveLength(1);
    view.rerender({ query: query('errors', { source: 'self' }) });
    expect(old.close).toHaveBeenCalledOnce();
    expect(view.result.current.rows).toEqual([]);
    act(() => old.event(logRow('late external')));
    expect(view.result.current.rows).toEqual([]);
    act(() => FakeSource.instances[1]!.event(logRow('self')));
    expect(view.result.current.rows.map(row => row.body)).toEqual(['self']);
  });

  it('exposes a Live preflight diagnostic only for its owning connection generation', () => {
    type Handlers = Parameters<typeof import('../api/explore-api').openLogStream>[1];
    let reject: Handlers['onInvalidFilter'];
    api.openLogStream.mockImplementationOnce((_path: string, handlers: Handlers) => {
      reject = handlers.onInvalidFilter;
      return new FakeSource(handlers);
    });
    const view = renderLive(query('service:', { searchSyntax: 'structured-v1' }));
    const diagnostic = { issue: 'missing_value', start: 8, end: 8, expression: 'service:' } as const;
    act(() => reject?.(undefined, diagnostic));
    expect(view.result.current.syntaxDiagnostic).toEqual(diagnostic);
    expect(view.result.current.status).toBe('invalid_filter');
    view.rerender({ query: query('service:checkout', { searchSyntax: 'structured-v1' }) });
    act(() => reject?.(undefined, diagnostic));
    expect(view.result.current.syntaxDiagnostic).toBeUndefined();
  });

  it('retains Live evidence and connection when only historical ordering changes', () => {
    const view = renderLive(query());
    const source = FakeSource.instances[0]!;
    act(() => source.event(logRow('retained')));
    view.rerender({
      query: query('errors', {
        logSort: JSON.stringify({ version: 1, field: 'attribute:duration', type: 'number', direction: 'desc' })
      })
    });
    expect(view.result.current.rows.map(row => row.body)).toEqual(['retained']);
    expect(source.close).not.toHaveBeenCalled();
    expect(FakeSource.instances).toHaveLength(1);
    view.rerender({ query: query('errors', { sort: 'oldest' }) });
    expect(view.result.current.rows.map(row => row.body)).toEqual(['retained']);
    expect(FakeSource.instances).toHaveLength(1);
  });

  it('exposes actual transport state without discarding gap integrity', () => {
    const view = renderLive(query());
    expect(view.result.current.connectionStatus).toBe('waiting');
    act(() => FakeSource.instances[0]!.open());
    expect(view.result.current.connectionStatus).toBe('connected');
  });
  it('owns waiting, connected, paused, unavailable, and clear transitions', () => {
    const view = renderLive(query());
    expect(view.result.current.status).toBe('waiting');
    const first = FakeSource.instances[0]!;
    act(() => first.open());
    expect(view.result.current.status).toBe('connected');
    act(() => first.event(logRow('one')));
    expect(view.result.current.rows).toHaveLength(1);
    act(() => view.result.current.togglePaused());
    expect(view.result.current.status).toBe('paused');
    expect(first.close).toHaveBeenCalledOnce();
    act(() => first.error());
    expect(view.result.current.status).toBe('paused');
    act(() => view.result.current.clear());
    expect(view.result.current.rows).toEqual([]);
    act(() => view.result.current.togglePaused());
    expect(view.result.current.status).toBe('degraded');
    const second = FakeSource.instances[1]!;
    act(() => second.error());
    expect(view.result.current.status).toBe('unavailable');
  });

  it('retires a malformed contract as terminal until explicit retry', () => {
    const view = renderLive(query());
    const source = FakeSource.instances[0]!;
    act(() => source.event(logRow('valid')));
    expect(view.result.current.rows[0]).toMatchObject({ body: 'valid', severityText: 'INFO' });
    act(() => source.contractError());
    expect(view.result.current.status).toBe('contract');
    expect(view.result.current.rows).toHaveLength(1);
    expect(source.close).toHaveBeenCalledOnce();
    act(() => source.event(logRow('recovered')));
    expect(view.result.current.status).toBe('contract');
    expect(view.result.current.rows.map(row => row.body)).toEqual(['valid']);

    act(() => view.result.current.retry());
    expect(source.close).toHaveBeenCalledOnce();
    expect(view.result.current.rows).toEqual([]);
    const replacement = FakeSource.instances[1]!;
    act(() => replacement.event(logRow('replacement')));
    expect(view.result.current.status).toBe('connected');
    expect(view.result.current.rows.map(row => row.body)).toEqual(['replacement']);
  });

  it('closes a source returned after a synchronous contract callback', () => {
    const close = vi.fn();
    api.openLogStream.mockImplementationOnce((_path: string, handlers: FakeHandlers) => {
      handlers.onContractError();
      return { close };
    });

    const view = renderLive(query());

    expect(view.result.current.status).toBe('contract');
    expect(close).toHaveBeenCalledOnce();
  });

  it('retries source construction failures explicitly', () => {
    api.openLogStream
      .mockImplementationOnce(() => {
        throw new Error('blocked');
      })
      .mockImplementation((_path: string, handlers: FakeHandlers) => new FakeSource(handlers));
    const view = renderLive(query());
    expect(view.result.current.status).toBe('error');
    act(() => view.result.current.retry());
    expect(view.result.current.status).toBe('waiting');
    expect(FakeSource.instances).toHaveLength(1);
    act(() => FakeSource.instances[0]!.open());
    expect(view.result.current.status).toBe('connected');
  });

  it('retries after the native retry budget is exhausted and ignores the retired stream', () => {
    const view = renderLive(query());
    const first = FakeSource.instances[0]!;
    act(() => {
      first.event(logRow('retained'));
      first.error();
    });
    expect(view.result.current.status).toBe('unavailable');

    act(() => view.result.current.retry());
    expect(first.close).toHaveBeenCalledOnce();
    expect(view.result.current.status).toBe('waiting');
    expect(view.result.current.rows).toEqual([]);
    const second = FakeSource.instances[1]!;
    act(() => {
      first.open();
      first.event(logRow('stale'));
    });
    expect(view.result.current.rows).toEqual([]);
    expect(view.result.current.status).toBe('waiting');
    act(() => second.event(logRow('replacement')));
    expect(view.result.current.status).toBe('connected');
    expect(view.result.current.rows.map(row => row.body)).toEqual(['replacement']);
  });

  it('lets native reconnect own retrying without creating a second logical stream', () => {
    const view = renderLive(query());
    const source = FakeSource.instances[0]!;
    act(() => source.retrying());
    expect(view.result.current.status).toBe('waiting');
    expect(FakeSource.instances).toHaveLength(1);
    act(() => source.open());
    expect(view.result.current.status).toBe('connected');
    act(() => source.retrying());
    expect(view.result.current.status).toBe('degraded');
    act(() => source.open());
    expect(view.result.current.status).toBe('degraded');
  });

  it('keeps a stream gap degraded across later logs until retry or a new evidence scope', () => {
    const view = renderLive(query());
    const first = FakeSource.instances[0]!;
    act(() => first.event(logRow('before-gap')));
    act(() => first.gap());
    expect(view.result.current.status).toBe('degraded');
    expect(view.result.current.gapDroppedCount).toBe(37);
    act(() => first.gap(12));
    expect(view.result.current.gapDroppedCount).toBe(49);
    expect(view.result.current.rows.map(row => row.body)).toEqual(['before-gap']);

    act(() => first.event(logRow('after-gap')));
    expect(view.result.current.status).toBe('degraded');
    expect(view.result.current.rows.map(row => row.body)).toEqual(['after-gap', 'before-gap']);

    act(() => view.result.current.retry());
    expect(view.result.current.status).toBe('waiting');
    expect(view.result.current.rows).toEqual([]);
    expect(view.result.current.gapDroppedCount).toBeUndefined();
    const replacement = FakeSource.instances[1]!;
    act(() => replacement.event(logRow('complete-again')));
    expect(view.result.current.status).toBe('connected');

    act(() => replacement.gap());
    view.rerender({ query: { ...query(), start: 1_000, end: 2_000 } });
    expect(view.result.current.status).toBe('connected');
    expect(view.result.current.rows).toEqual([]);
  });

  it('marks disconnect-style pause as degraded until a clearing retry', () => {
    const view = renderLive(query());
    const first = FakeSource.instances[0]!;
    act(() => {
      first.open();
      first.event(logRow('before-pause'));
      view.result.current.togglePaused();
    });
    expect(view.result.current.status).toBe('paused');
    expect(view.result.current.rows.map(row => row.body)).toEqual(['before-pause']);
    expect(view.result.current.pauseDisconnectGap).toBe(true);

    act(() => view.result.current.togglePaused());
    expect(view.result.current.status).toBe('degraded');
    expect(view.result.current.pauseDisconnectGap).toBe(true);
    const resumed = FakeSource.instances[1]!;
    act(() => resumed.event(logRow('after-resume')));
    expect(view.result.current.status).toBe('degraded');
    act(() => resumed.gap(12));
    expect(view.result.current.gapDroppedCount).toBe(12);

    act(() => view.result.current.retry());
    expect(view.result.current.status).toBe('waiting');
    expect(view.result.current.rows).toEqual([]);
  });

  it('falls back to a generic gap when known dropped counts overflow', () => {
    const view = renderLive(query());
    const source = FakeSource.instances[0]!;
    act(() => {
      source.gap(Number.MAX_SAFE_INTEGER);
      source.gap(1);
      source.gap(12);
    });
    expect(view.result.current.status).toBe('degraded');
    expect(view.result.current.gapDroppedCount).toBeUndefined();
  });

  it('closes old paths and ignores late events after reroute or unmount', () => {
    const view = renderLive(query('first'));
    const first = FakeSource.instances[0]!;
    act(() => first.event(logRow('first')));
    expect(view.result.current.rows[0]?.body).toBe('first');
    view.rerender({ query: query('second') });
    expect(first.close).toHaveBeenCalledOnce();
    expect(view.result.current.rows).toEqual([]);
    act(() => first.event(logRow('stale')));
    expect(view.result.current.rows).toEqual([]);
    const second = FakeSource.instances[1]!;
    view.unmount();
    expect(second.close).toHaveBeenCalledOnce();
    act(() => second.event(logRow('late')));
  });

  it('clears route-owned evidence without reconnecting when the transport path is unchanged', () => {
    const initial = query('errors', {
      intakeProfileId: 'primary-ingress',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'prod',
      start: 1_000,
      end: 2_000
    });
    const view = renderLive(initial);
    const source = FakeSource.instances[0]!;
    act(() => source.event(logRow('first-window')));

    view.rerender({ query: { ...initial, start: 3_000, end: 4_000 } });
    expect(source.close).not.toHaveBeenCalled();
    expect(FakeSource.instances).toHaveLength(1);
    expect(view.result.current.rows).toEqual([]);
    expect(view.result.current.status).toBe('connected');
    act(() => source.event(logRow('second-window')));
    expect(view.result.current.rows.map(row => row.body)).toEqual(['second-window']);

    view.rerender({ query: { ...initial, intakeProfileId: 'backup-ingress', start: 3_000, end: 4_000 } });
    expect(source.close).not.toHaveBeenCalled();
    expect(FakeSource.instances).toHaveLength(1);
    expect(view.result.current.rows).toEqual([]);
    expect(view.result.current.status).toBe('connected');
    act(() => source.event(logRow('backup-profile')));
    expect(view.result.current.rows.map(row => row.body)).toEqual(['backup-profile']);
  });

  it('keeps paused rows scoped to their stream path and reconnects the current path on resume', () => {
    const view = renderLive(query('first'));
    const first = FakeSource.instances[0]!;
    act(() => first.event(logRow('first')));
    act(() => view.result.current.togglePaused());

    view.rerender({ query: query('second') });
    expect(view.result.current.status).toBe('paused');
    expect(view.result.current.rows).toEqual([]);
    expect(FakeSource.instances).toHaveLength(1);

    act(() => first.event(logRow('stale')));
    expect(view.result.current.rows).toEqual([]);
    act(() => view.result.current.togglePaused());
    expect(view.result.current.status).toBe('waiting');
    expect(FakeSource.instances).toHaveLength(2);
  });

  it('retires callbacks and evidence when the session role scope changes', () => {
    const view = renderLive(query());
    const first = FakeSource.instances[0]!;
    act(() => first.event(logRow('operator-only')));
    expect(view.result.current.rows).toHaveLength(1);

    auth.state.session = authenticatedSession({ roles: ['VIEWER'] });
    view.rerender({ query: query() });
    expect(first.close).toHaveBeenCalledOnce();
    expect(view.result.current.rows).toEqual([]);
    const second = FakeSource.instances[1]!;
    act(() => first.event(logRow('stale')));
    expect(view.result.current.rows).toEqual([]);
    act(() => second.event(logRow('viewer')));
    expect(view.result.current.rows[0]?.body).toBe('viewer');
  });

  it('does not restore old privileged rows when a session role scope returns', () => {
    auth.state.session = authenticatedSession({ roles: ['ADMIN'] });
    const view = renderLive(query());
    const adminSource = FakeSource.instances[0]!;
    act(() => adminSource.event(logRow('admin-only')));
    expect(view.result.current.rows[0]?.body).toBe('admin-only');

    auth.state.session = authenticatedSession({ roles: ['GUEST'] });
    view.rerender({ query: query() });
    expect(view.result.current.rows).toEqual([]);
    expect(view.result.current.status).toBe('waiting');
    const guestSource = FakeSource.instances[1]!;

    auth.state.session = authenticatedSession({ roles: ['ADMIN'] });
    view.rerender({ query: query() });
    expect(guestSource.close).toHaveBeenCalledOnce();
    expect(view.result.current.rows).toEqual([]);
    expect(view.result.current.status).toBe('waiting');
    expect(FakeSource.instances).toHaveLength(3);
  });

  it.each([
    ['username', authenticatedSession({ username: 'second-operator' })],
    ['workspace', authenticatedSession({ workspaceId: 'secondary' })],
    [
      'logout',
      {
        authenticated: false,
        username: null,
        roles: [],
        workspaceId: null,
        expiresAt: null
      } satisfies UiSession
    ]
  ])('retires the connection and evidence across a %s session boundary', (_boundary, nextSession) => {
    const view = renderLive(query());
    const first = FakeSource.instances[0]!;
    act(() => first.event(logRow('private')));

    auth.state.session = nextSession;
    view.rerender({ query: query() });
    expect(first.close).toHaveBeenCalledOnce();
    expect(view.result.current.rows).toEqual([]);
    expect(view.result.current.status).toBe('waiting');
    expect(FakeSource.instances).toHaveLength(2);
  });

  it('preserves divergent records sharing generated IDs within one batch', () => {
    const view = renderLive(query());
    const source = FakeSource.instances[0]!;
    const first = {
      ...logRow('record'),
      attributes: { 'log.record.uid': 'generated-id', 'hertzbeat.event_id': 'generated-id' },
      resource: { 'service.name': 'checkout' }
    };
    const differentBody = { ...first, body: 'other record' };
    const differentService = { ...first, resource: { 'service.name': 'payments' } };
    act(() => {
      source.event(first, false);
      source.event(differentBody, false);
      source.event(differentService, false);
      source.event(structuredClone(first), false);
      vi.advanceTimersByTime(200);
    });
    expect(view.result.current.rows).toEqual([differentService, differentBody, first]);
    expect(view.result.current.locallyDroppedCount).toBe(0);
  });

  it('ignores old connection callbacks between layout commit and passive cleanup', () => {
    const view = renderHook(
      ({ query: current, afterLayout }) => {
        const live = useLiveLogController(current);
        useLayoutEffect(afterLayout, [afterLayout]);
        return live;
      },
      { initialProps: { query: query(), afterLayout: () => undefined } }
    );
    const first = FakeSource.instances[0]!;
    act(() => first.event(logRow('private')));

    auth.state.session = authenticatedSession({ username: 'second-operator' });
    view.rerender({
      query: query(),
      afterLayout: () => {
        first.event(logRow('stale'));
        first.gap();
      }
    });

    expect(first.close).toHaveBeenCalledOnce();
    expect(view.result.current.rows).toEqual([]);
    expect(view.result.current.status).toBe('waiting');
    expect(FakeSource.instances).toHaveLength(2);
  });

  it('retires old callbacks at the Retry layout boundary before passive cleanup', () => {
    let afterLayout = () => undefined;
    const view = renderLiveWithLayoutProbe(query(), () => afterLayout());
    const first = FakeSource.instances[0]!;
    act(() => first.event(logRow('old-boundary')));

    afterLayout = () => {
      afterLayout = () => undefined;
      first.event(logRow('stale'));
      first.gap();
      first.open();
    };
    act(() => view.result.current.retry());

    expect(view.result.current.rows).toEqual([]);
    expect(view.result.current.gapDroppedCount).toBeUndefined();
    expect(view.result.current.status).toBe('waiting');
    expect(first.close).toHaveBeenCalledOnce();
    expect(FakeSource.instances).toHaveLength(2);
  });

  it('retires old callbacks at the Pause layout boundary before passive cleanup', () => {
    let afterLayout = () => undefined;
    const view = renderLiveWithLayoutProbe(query(), () => afterLayout());
    const first = FakeSource.instances[0]!;
    act(() => {
      first.open();
      first.event(logRow('before-pause'));
    });

    afterLayout = () => {
      afterLayout = () => undefined;
      first.event(logRow('stale'));
      first.gap();
      first.open();
    };
    act(() => view.result.current.togglePaused());

    expect(view.result.current.rows.map(row => row.body)).toEqual(['before-pause']);
    expect(view.result.current.gapDroppedCount).toBeUndefined();
    expect(view.result.current.status).toBe('paused');
    expect(first.close).toHaveBeenCalledOnce();
    expect(FakeSource.instances).toHaveLength(1);
  });

  it('deduplicates retained event identities without merging distinct untitled objects', () => {
    const view = renderLive(query());
    const source = FakeSource.instances[0]!;
    const noUid = logRow('same content');
    const peer = { ...noUid };
    const uid = { ...logRow('identified'), attributes: { 'log.record.uid': 'event-1' } };
    act(() => {
      source.event(noUid, false);
      source.event(noUid, false);
      source.event(peer, false);
      source.event(uid, false);
      source.event({ ...uid }, false);
      vi.advanceTimersByTime(200);
    });
    expect(view.result.current.rows).toEqual([uid, peer, noUid]);
    expect(view.result.current.locallyDroppedCount).toBe(0);
    act(() => {
      source.event(noUid, false);
      source.event({ ...uid }, false);
      vi.advanceTimersByTime(200);
    });
    expect(view.result.current.rows).toEqual([uid, peer, noUid]);
    expect(view.result.current.locallyDroppedCount).toBe(0);
  });

  it('does not let replayed retained events evict unique rows at the 500-row boundary', () => {
    const view = renderLive(query());
    const source = FakeSource.instances[0]!;
    const rows = Array.from({ length: 500 }, (_, index) => ({
      ...logRow(String(index)),
      attributes: { 'log.record.uid': String(index) }
    }));
    act(() => {
      rows.forEach(row => source.event(row, false));
      vi.advanceTimersByTime(200);
    });
    const before = view.result.current.rows;
    act(() => {
      source.event({ ...rows[0]! }, false);
      source.event({ ...rows[499]! }, false);
      vi.advanceTimersByTime(200);
    });
    expect(view.result.current.rows).toEqual(before);
    expect(view.result.current.locallyDroppedCount).toBe(0);
    act(() => source.event({ ...logRow('new'), attributes: { 'log.record.uid': 'new' } }));
    expect(view.result.current.rows).toHaveLength(500);
    expect(view.result.current.locallyDroppedCount).toBe(1);
    act(() => source.event({ ...rows[0]! }));
    expect(view.result.current.rows[0]?.attributes?.['log.record.uid']).toBe('0');
    expect(view.result.current.locallyDroppedCount).toBe(2);
  });

  it.each([
    ['body', { body: 'different record' }],
    ['service resource', { resource: { 'service.name': 'payments' } }],
    [
      'instrumentation scope',
      { instrumentationScope: { name: 'other-library', version: '2', attributes: null, droppedAttributesCount: 0 } }
    ],
    ['ingestion identity', { attributes: { 'log.record.uid': 'collision', 'hertzbeat.ingest_id': 'second-ingestion' } }]
  ] as const)('preserves equal IDs with different %s payloads', (_field, difference) => {
    const view = renderLive(query());
    const source = FakeSource.instances[0]!;
    const first = {
      ...logRow('record'),
      attributes: { 'log.record.uid': 'collision' },
      resource: { 'service.name': 'checkout' }
    };
    const second = { ...first, ...difference };
    act(() => {
      source.event(first);
      source.event(second);
    });
    expect(view.result.current.rows).toEqual([second, first]);
    expect(view.result.current.locallyDroppedCount).toBe(0);
    act(() => source.event(structuredClone(second)));
    expect(view.result.current.rows).toEqual([second, first]);
  });

  it('keeps only the latest 500 canonical rows', () => {
    const view = renderLive(query());
    const source = FakeSource.instances[0]!;
    act(() => {
      for (let index = 0; index < 501; index += 1) source.event(logRow(String(index)));
    });
    expect(view.result.current.rows).toHaveLength(500);
    expect(view.result.current.rows[0]?.body).toBe('500');
    expect(view.result.current.rows.at(-1)?.body).toBe('1');
    expect(view.result.current.locallyDroppedCount).toBe(1);
  });

  it('commits high-volume bursts in bounded batches and counts every evicted row', () => {
    let renders = 0;
    const view = renderHook(() => {
      renders += 1;
      return useLiveLogController(query());
    });
    const source = FakeSource.instances[0]!;
    act(() => {
      for (let index = 1; index <= 2500; index += 1) source.event(logRow(String(index)), false);
      vi.advanceTimersByTime(200);
    });
    expect(view.result.current.rows).toHaveLength(500);
    expect(view.result.current.rows[0]?.body).toBe('2500');
    expect(view.result.current.rows.at(-1)?.body).toBe('2001');
    expect(view.result.current.locallyDroppedCount).toBe(2000);
    expect(renders).toBeLessThanOrEqual(4);
  });

  it('does not restore queued rows after clear and flushes accepted rows before pause', () => {
    const view = renderLive(query());
    const source = FakeSource.instances[0]!;
    act(() => source.event(logRow('cleared'), false));
    act(() => view.result.current.clear());
    act(() => void vi.advanceTimersByTime(200));
    expect(view.result.current.rows).toEqual([]);

    act(() => source.event(logRow('kept-on-pause'), false));
    act(() => view.result.current.togglePaused());
    expect(view.result.current.rows.map(row => row.body)).toEqual(['kept-on-pause']);
  });

  it('drains queued evidence before terminal errors and cancels it at a query boundary', () => {
    const terminal = renderLive(query());
    const first = FakeSource.instances[0]!;
    act(() => first.event(logRow('before-terminal'), false));
    act(() => first.contractError());
    expect(terminal.result.current.rows.map(row => row.body)).toEqual(['before-terminal']);
    expect(terminal.result.current.status).toBe('contract');

    const rerouted = renderLive(query('first'));
    const oldSource = FakeSource.instances.at(-1)!;
    act(() => oldSource.event(logRow('stale-scope'), false));
    rerouted.rerender({ query: query('second') });
    act(() => void vi.advanceTimersByTime(200));
    expect(rerouted.result.current.rows).toEqual([]);
  });

  it('ignores every retired callback during pause and after resume into another query', () => {
    const view = renderLive(query('first'));
    const first = FakeSource.instances[0]!;
    act(() => first.event(logRow('retained'), false));
    act(() => view.result.current.togglePaused());
    const deliverRetired = () => {
      first.open();
      first.retrying();
      first.event(logRow('stale'), false);
      first.gap();
      first.contractError();
      first.error();
      vi.advanceTimersByTime(200);
    };
    act(deliverRetired);
    expect(view.result.current.status).toBe('paused');
    expect(view.result.current.rows.map(row => row.body)).toEqual(['retained']);
    expect(view.result.current.gapDroppedCount).toBeUndefined();
    expect(view.result.current.locallyDroppedCount).toBe(0);
    expect(FakeSource.instances).toHaveLength(1);
    view.rerender({ query: query('second') });
    act(() => view.result.current.togglePaused());
    const resumed = FakeSource.instances[1]!;
    act(() => {
      resumed.open();
      resumed.event(logRow('current'));
    });
    act(deliverRetired);
    expect(view.result.current.connectionStatus).toBe('connected');
    expect(view.result.current.rows.map(row => row.body)).toEqual(['current']);
    expect(view.result.current.gapDroppedCount).toBeUndefined();
    expect(resumed.close).not.toHaveBeenCalled();
  });

  it('cancels a queued flush on unmount and never recreates a retired connection', () => {
    const view = renderLive(query());
    const source = FakeSource.instances[0]!;
    act(() => source.event(logRow('queued'), false));
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(source.close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    act(() => {
      source.open();
      source.retrying();
      source.event(logRow('late'), false);
      source.error();
    });
    act(() => void vi.advanceTimersByTime(20_000));
    expect(vi.getTimerCount()).toBe(0);
    expect(FakeSource.instances).toHaveLength(1);
  });
});

function renderLive(initialQuery: LogExploreQuery) {
  return renderHook(({ query: current }) => useLiveLogController(current), { initialProps: { query: initialQuery } });
}
function renderLiveWithLayoutProbe(initialQuery: LogExploreQuery, afterLayout: () => void) {
  return renderHook(
    ({ query: current }) => {
      const live = useLiveLogController(current);
      useLayoutEffect(afterLayout);
      return live;
    },
    { initialProps: { query: initialQuery } }
  );
}
function query(value = 'errors', override: Partial<LogExploreQuery> = {}): LogExploreQuery {
  return { signal: 'logs', timeRange: 'last-30m', live: true, query: value, ...override };
}
function authenticatedSession(override: Partial<UiSession> = {}): UiSession {
  return {
    authenticated: true,
    username: 'operator',
    roles: ['ADMIN'],
    workspaceId: 'default',
    expiresAt: '2030-01-01T00:00:00.000Z',
    ...override
  };
}
function logRow(body: string): import('../model/explore-signal-contract').LiveLogRow {
  return {
    timeUnixNano: 1_750_000_000_000_000_000,
    observedTimeUnixNano: null,
    severityNumber: 9,
    severityText: 'INFO',
    body,
    attributes: null,
    droppedAttributesCount: null,
    traceId: null,
    spanId: null,
    traceFlags: null,
    resource: null,
    resourceSchemaUrl: null,
    instrumentationScope: null,
    scopeSchemaUrl: null
  };
}

type FakeHandlers = {
  onOpen: () => void;
  onRetrying: () => void;
  onLog: (row: ReturnType<typeof logRow>) => void;
  onGap: (gap: { observedAt: number; reason: 'queue_overflow'; droppedCount: number }) => void;
  onUnavailable: () => void;
  onContractError: () => void;
};

class FakeSource {
  static instances: FakeSource[] = [];
  close = vi.fn();
  constructor(private readonly handlers: FakeHandlers) {
    FakeSource.instances.push(this);
  }
  open() {
    this.handlers.onOpen();
  }
  retrying() {
    this.handlers.onRetrying();
  }
  error() {
    this.handlers.onUnavailable();
  }
  contractError() {
    this.handlers.onContractError();
  }
  event(row: ReturnType<typeof logRow>, flush = true) {
    this.handlers.onLog(row);
    if (flush) vi.advanceTimersByTime(200);
  }
  gap(droppedCount = 37) {
    this.handlers.onGap({ observedAt: 1_750_000_000_000, reason: 'queue_overflow', droppedCount });
  }
}
