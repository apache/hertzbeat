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

import { withCookieHeaderAdmission } from './cookie-header-admission';
import { openBrowserEventStream as createStream } from './event-stream';

describe('browser event stream transport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    vi.clearAllMocks();
  });
  afterEach(async () => {
    streams.splice(0).forEach(stream => stream.close());
    await flush();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('refreshes once and stops after the bounded consecutive retry budget', async () => {
    const handlers = callbacks();
    openBrowserEventStream('/logs', handlers);
    await flush();

    for (const delay of [1_000, 3_000, 10_000]) {
      FakeEventSource.instances.at(-1)?.fail();
      await vi.advanceTimersByTimeAsync(delay);
    }
    FakeEventSource.instances.at(-1)?.fail();
    await flush();

    expect(FakeEventSource.instances).toHaveLength(4);
    expect(refreshBrowserSession).toHaveBeenCalledOnce();
    expect(handlers.onRetrying).toHaveBeenCalledTimes(3);
    expect(handlers.onUnavailable).toHaveBeenCalledOnce();
    expect(FakeEventSource.instances.every(source => source.close.mock.calls.length === 1)).toBe(true);
  });

  it('forwards named events and cancels a pending retry on close', async () => {
    const handlers = callbacks();
    const stream = openBrowserEventStream('/logs', handlers);
    await flush();
    const source = FakeEventSource.instances[0]!;
    source.open();
    await flush();
    source.emit('LOG_EVENT', 'payload');
    source.fail();
    source.fail();
    await flush();
    stream.close();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(handlers.onOpen).toHaveBeenCalledOnce();
    expect(handlers.onEvent).toHaveBeenCalledWith('LOG_EVENT', 'payload');
    expect(refreshBrowserSession).toHaveBeenCalledOnce();
    expect(handlers.onRetrying).toHaveBeenCalledOnce();
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it('waits the complete backoff interval and closes without a leftover retry timer', async () => {
    const handlers = callbacks();
    const stream = openBrowserEventStream('/logs', handlers);
    await flush();
    for (const delay of [1_000, 3_000, 10_000]) {
      const count = FakeEventSource.instances.length;
      FakeEventSource.instances.at(-1)!.fail();
      await vi.advanceTimersByTimeAsync(delay - 1);
      expect(FakeEventSource.instances).toHaveLength(count);
      await vi.advanceTimersByTimeAsync(1);
      expect(FakeEventSource.instances).toHaveLength(count + 1);
    }
    stream.close();
    await flush();
    expect(vi.getTimerCount()).toBe(0);
    expect(refreshBrowserSession).toHaveBeenCalledOnce();
    expect(handlers.onUnavailable).not.toHaveBeenCalled();
  });

  it('bounds constructor failures even when session refresh rejects', async () => {
    const construct = vi.fn(function () {
      throw new Error('transport unavailable');
    });
    vi.stubGlobal('EventSource', construct);
    refreshBrowserSession.mockRejectedValueOnce(new Error('refresh unavailable'));
    const handlers = callbacks();
    const stream = openBrowserEventStream('/logs', handlers);
    await flush();
    await vi.advanceTimersByTimeAsync(14_000);
    expect(construct).toHaveBeenCalledTimes(4);
    expect(refreshBrowserSession).toHaveBeenCalledOnce();
    expect(handlers.onRetrying).toHaveBeenCalledTimes(3);
    expect(handlers.onUnavailable).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    stream.close();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(construct).toHaveBeenCalledTimes(4);
  });

  it('ignores events and errors from a superseded native source', async () => {
    const handlers = callbacks();
    openBrowserEventStream('/logs', handlers);
    await flush();
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

  it('refreshes once again after a retry has genuinely opened a new connection', async () => {
    const handlers = callbacks();
    openBrowserEventStream('/logs', handlers);
    await flush();
    const first = FakeEventSource.instances[0]!;

    first.fail();
    await vi.advanceTimersByTimeAsync(1_000);
    const recovered = FakeEventSource.instances[1]!;
    recovered.open();
    await flush();
    recovered.fail();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(refreshBrowserSession).toHaveBeenCalledTimes(2);
    expect(handlers.onOpen).toHaveBeenCalledOnce();
    expect(handlers.onRetrying).toHaveBeenCalledTimes(2);
    expect(FakeEventSource.instances).toHaveLength(3);
  });

  it('does not reconnect or deliver callbacks after close while refresh is pending', async () => {
    const refresh = deferred<boolean>();
    refreshBrowserSession.mockReturnValueOnce(refresh.promise);
    const handlers = callbacks();
    const stream = openBrowserEventStream('/logs', handlers);
    await flush();
    const source = FakeEventSource.instances[0]!;

    source.fail();
    await flush();
    stream.close();
    source.open();
    await flush();
    source.emit('LOG_EVENT', 'stale');
    source.fail();
    refresh.resolve(true);
    await refresh.promise;
    await vi.advanceTimersByTimeAsync(10_000);

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(handlers.onOpen).not.toHaveBeenCalled();
    expect(handlers.onEvent).not.toHaveBeenCalled();
    expect(handlers.onRetrying).toHaveBeenCalledOnce();
    expect(handlers.onUnavailable).not.toHaveBeenCalled();
  });

  it('does not construct after close while queued behind a cookie writer', async () => {
    const holder = deferred<void>();
    const write = withCookieHeaderAdmission('exclusive', () => holder.promise);
    await flush();
    const handlers = callbacks();
    const stream = openBrowserEventStream('/logs', handlers);
    stream.close();
    holder.resolve();
    await write;
    await flush();
    expect(FakeEventSource.instances).toHaveLength(0);
    expect(handlers.onOpen).not.toHaveBeenCalled();
  });

  it('releases at open so an endless event body does not block a writer', async () => {
    const stream = openBrowserEventStream('/logs', callbacks());
    await flush();
    let wrote = false;
    const write = withCookieHeaderAdmission('exclusive', async () => {
      wrote = true;
      await Promise.resolve();
    });
    await flush();
    expect(wrote).toBe(false);
    FakeEventSource.instances[0]!.open();
    await write;
    expect(wrote).toBe(true);
    stream.close();
  });

  it('closes a stalled native opening before releasing its admission', async () => {
    const stream = openBrowserEventStream('/logs', callbacks());
    await flush();
    const first = FakeEventSource.instances[0]!;
    let closedAtWrite = false;
    const write = withCookieHeaderAdmission('exclusive', async () => {
      closedAtWrite = first.close.mock.calls.length > 0;
      await Promise.resolve();
    });
    stream.close();
    await write;
    expect(closedAtWrite).toBe(true);
    first.open();
    first.fail();
    await flush();
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it('does not construct a timed-out queued opening after its writer releases', async () => {
    const holder = deferred<void>();
    const write = withCookieHeaderAdmission('exclusive', () => holder.promise).catch(() => {});
    await flush();
    const stream = openBrowserEventStream('/logs', callbacks());
    await vi.advanceTimersByTimeAsync(30_001);
    stream.close();
    holder.resolve();
    await write;
    await flush();
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it('readmits each retry behind a queued writer', async () => {
    const stream = openBrowserEventStream('/logs', callbacks());
    await flush();
    const holder = deferred<void>();
    const write = withCookieHeaderAdmission('exclusive', () => holder.promise);
    FakeEventSource.instances[0]!.fail();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(FakeEventSource.instances).toHaveLength(1);
    holder.resolve();
    await write;
    await flush();
    expect(FakeEventSource.instances).toHaveLength(2);
    stream.close();
  });

  it('retires an opened source when onOpen throws without refreshing or retrying', async () => {
    const report = vi.fn();
    vi.stubGlobal('reportError', report);
    const handlers = callbacks();
    const failure = new Error('Synthetic consumer callback failure');
    handlers.onOpen.mockImplementation(() => {
      throw failure;
    });
    const stream = openBrowserEventStream('/logs', handlers);
    await flush();
    const first = FakeEventSource.instances[0]!;
    first.open();
    await flush();
    expect(first.close).toHaveBeenCalledOnce();
    expect(report).toHaveBeenCalledExactlyOnceWith(failure);
    await vi.advanceTimersByTimeAsync(14_000);
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(refreshBrowserSession).not.toHaveBeenCalled();
    first.fail();
    first.emit('LOG_EVENT', 'late');
    expect(handlers.onEvent).not.toHaveBeenCalled();
    stream.close();
  });

  it.each(['onEvent', 'onRetrying', 'onUnavailable'] as const)(
    'retires ownership when %s throws without further retry or callback delivery',
    async callback => {
      const report = vi.fn();
      vi.stubGlobal('reportError', report);
      const failure = new Error('Synthetic consumer callback failure');
      const handlers = callbacks();
      handlers[callback].mockImplementation(() => {
        throw failure;
      });
      const stream = openBrowserEventStream('/logs', handlers);
      await flush();
      if (callback === 'onEvent') {
        FakeEventSource.instances[0]!.open();
        await flush();
        FakeEventSource.instances[0]!.emit('LOG_EVENT', 'payload');
      } else if (callback === 'onRetrying') {
        FakeEventSource.instances[0]!.open();
        await flush();
        FakeEventSource.instances[0]!.fail();
      } else {
        for (const delay of [1_000, 3_000, 10_000]) {
          FakeEventSource.instances.at(-1)!.fail();
          await vi.advanceTimersByTimeAsync(delay);
        }
        FakeEventSource.instances.at(-1)!.fail();
        await flush();
      }
      expect(report).toHaveBeenCalledExactlyOnceWith(failure);
      expect(FakeEventSource.instances.every(source => source.close.mock.calls.length === 1)).toBe(true);
      const count = FakeEventSource.instances.length;
      const refreshCount = refreshBrowserSession.mock.calls.length;
      await vi.advanceTimersByTimeAsync(40_000);
      expect(FakeEventSource.instances).toHaveLength(count);
      expect(refreshBrowserSession).toHaveBeenCalledTimes(refreshCount);
      FakeEventSource.instances.forEach(source => {
        source.open();
        source.fail();
        source.emit('LOG_EVENT', 'late');
      });
      expect(report).toHaveBeenCalledOnce();
      stream.close();
    }
  );
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(complete => {
    resolve = complete;
  });
  return { promise, resolve };
}

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
  constructor(readonly path: string) {
    FakeEventSource.instances.push(this);
  }
  addEventListener(name: string, listener: EventListenerOrEventListenerObject) {
    this.listeners.set(name, listener as (event: MessageEvent<string>) => void);
  }
  open() {
    this.onopen?.();
  }
  fail() {
    this.onerror?.();
  }
  emit(name: string, data: string) {
    this.listeners.get(name)?.(new MessageEvent(name, { data }));
  }
}

async function flush() {
  for (let i = 0; i < 24; i += 1) await Promise.resolve();
}

const streams: ReturnType<typeof createStream>[] = [];
function openBrowserEventStream(...args: Parameters<typeof createStream>) {
  const stream = createStream(...args);
  streams.push(stream);
  return stream;
}
