/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LogExploreQuery } from '../model/explore-model';
import { useLiveLogController } from './use-live-log-controller';

const api = vi.hoisted(() => ({ buildLogStreamPath: vi.fn(), openLogStream: vi.fn() }));
vi.mock('../api/explore-api', async importOriginal => ({ ...(await importOriginal<typeof import('../api/explore-api')>()), ...api }));

describe('Live Log controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    FakeSource.instances = [];
    api.buildLogStreamPath.mockImplementation((query: LogExploreQuery) => `/stream?query=${query.query ?? ''}`);
    api.openLogStream.mockImplementation(() => new FakeSource());
  });

  it('owns waiting, connected, paused, unavailable, and clear transitions', () => {
    const view = renderLive(query());
    expect(view.result.current.status).toBe('waiting');
    const first = FakeSource.instances[0]!;
    act(() => first.open());
    expect(view.result.current.status).toBe('connected');
    act(() => first.event(logJson('one')));
    expect(view.result.current.rows).toHaveLength(1);
    act(() => view.result.current.togglePaused());
    expect(view.result.current.status).toBe('paused');
    expect(first.close).toHaveBeenCalledOnce();
    act(() => first.error());
    expect(view.result.current.status).toBe('paused');
    act(() => view.result.current.clear());
    expect(view.result.current.rows).toEqual([]);
    act(() => view.result.current.togglePaused());
    expect(view.result.current.status).toBe('waiting');
    const second = FakeSource.instances[1]!;
    act(() => second.error());
    expect(view.result.current.status).toBe('unavailable');
  });

  it('parses every LOG_EVENT through the strict LogRow contract', () => {
    const view = renderLive(query());
    const source = FakeSource.instances[0]!;
    act(() => source.event(logJson('valid')));
    expect(view.result.current.rows[0]).toMatchObject({ body: 'valid', severityText: 'INFO' });
    act(() => source.event('{bad json'));
    expect(view.result.current.status).toBe('contract');
    act(() => source.event(JSON.stringify({ body: 'partial' })));
    expect(view.result.current.status).toBe('contract');
    expect(view.result.current.rows).toHaveLength(1);
  });

  it('reports source construction failures as error', () => {
    api.openLogStream.mockImplementation(() => { throw new Error('blocked'); });
    const view = renderLive(query());
    expect(view.result.current.status).toBe('error');
  });

  it('closes old paths and ignores late events after reroute or unmount', () => {
    const view = renderLive(query('first'));
    const first = FakeSource.instances[0]!;
    act(() => first.event(logJson('first')));
    expect(view.result.current.rows[0]?.body).toBe('first');
    view.rerender({ query: query('second') });
    expect(first.close).toHaveBeenCalledOnce();
    expect(view.result.current.rows).toEqual([]);
    act(() => first.event(logJson('stale')));
    expect(view.result.current.rows).toEqual([]);
    const second = FakeSource.instances[1]!;
    view.unmount();
    expect(second.close).toHaveBeenCalledOnce();
    act(() => second.event(logJson('late')));
  });

  it('keeps only the latest 500 canonical rows', () => {
    const view = renderLive(query());
    const source = FakeSource.instances[0]!;
    act(() => {
      for (let index = 0; index < 501; index += 1) source.event(logJson(String(index)));
    });
    expect(view.result.current.rows).toHaveLength(500);
    expect(view.result.current.rows[0]?.body).toBe('500');
    expect(view.result.current.rows.at(-1)?.body).toBe('1');
  });
});

function renderLive(initialQuery: LogExploreQuery) {
  return renderHook(({ query: current }) => useLiveLogController(current), { initialProps: { query: initialQuery } });
}
function query(value = 'errors'): LogExploreQuery { return { signal: 'logs', timeRange: 'last-30m', live: true, query: value }; }
function logJson(body: string) {
  return JSON.stringify({ timeUnixNano: 1_750_000_000_000_000_000, observedTimeUnixNano: null, severityNumber: 9,
    severityText: 'INFO', body, attributes: null, droppedAttributesCount: null, traceId: null, spanId: null,
    traceFlags: null, resource: null, resourceSchemaUrl: null, instrumentationScope: null, scopeSchemaUrl: null });
}

class FakeSource {
  static instances: FakeSource[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();
  private listener: ((event: MessageEvent<string>) => void) | undefined;
  constructor() { FakeSource.instances.push(this); }
  addEventListener(name: string, listener: EventListenerOrEventListenerObject) {
    if (name === 'LOG_EVENT') this.listener = listener as (event: MessageEvent<string>) => void;
  }
  open() { this.onopen?.(); }
  error() { this.onerror?.(); }
  event(data: string) { this.listener?.(new MessageEvent('LOG_EVENT', { data })); }
}
