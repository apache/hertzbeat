/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { refreshBrowserSession } = vi.hoisted(() => ({ refreshBrowserSession: vi.fn().mockResolvedValue(true) }));
vi.mock('./http-client', () => ({ refreshBrowserSession }));

import { openBrowserEventStream } from './event-stream';

describe('browser event stream transport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('refreshes once and stops after the bounded consecutive retry budget', async () => {
    const handlers = callbacks();
    openBrowserEventStream('/logs', handlers);

    for (const delay of [1_000, 3_000, 10_000]) {
      FakeEventSource.instances.at(-1)?.fail();
      await vi.advanceTimersByTimeAsync(delay);
    }
    FakeEventSource.instances.at(-1)?.fail();

    expect(FakeEventSource.instances).toHaveLength(4);
    expect(refreshBrowserSession).toHaveBeenCalledOnce();
    expect(handlers.onRetrying).toHaveBeenCalledTimes(3);
    expect(handlers.onUnavailable).toHaveBeenCalledOnce();
    expect(FakeEventSource.instances.every(source => source.close.mock.calls.length === 1)).toBe(true);
  });

  it('forwards named events and cancels a pending retry on close', async () => {
    const handlers = callbacks();
    const stream = openBrowserEventStream('/logs', handlers);
    const source = FakeEventSource.instances[0]!;
    source.open();
    source.emit('LOG_EVENT', 'payload');
    source.fail();
    source.fail();
    stream.close();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(handlers.onOpen).toHaveBeenCalledOnce();
    expect(handlers.onEvent).toHaveBeenCalledWith('LOG_EVENT', 'payload');
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it('ignores events and errors from a superseded native source', async () => {
    const handlers = callbacks();
    openBrowserEventStream('/logs', handlers);
    const first = FakeEventSource.instances[0]!;
    first.fail();
    await vi.advanceTimersByTimeAsync(1_000);
    const second = FakeEventSource.instances[1]!;
    second.open();

    first.emit('LOG_EVENT', 'stale');
    first.fail();

    expect(handlers.onEvent).not.toHaveBeenCalled();
    expect(second.close).not.toHaveBeenCalled();
    expect(FakeEventSource.instances).toHaveLength(2);
  });
});

function callbacks() {
  return {
    eventNames: ['LOG_EVENT'],
    onOpen: vi.fn(),
    onEvent: vi.fn(),
    onRetrying: vi.fn(),
    onUnavailable: vi.fn()
  };
}

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();
  private listeners = new Map<string, (event: MessageEvent<string>) => void>();
  constructor(readonly path: string) { FakeEventSource.instances.push(this); }
  addEventListener(name: string, listener: EventListenerOrEventListenerObject) {
    this.listeners.set(name, listener as (event: MessageEvent<string>) => void);
  }
  open() { this.onopen?.(); }
  fail() { this.onerror?.(); }
  emit(name: string, data: string) { this.listeners.get(name)?.(new MessageEvent(name, { data })); }
}
