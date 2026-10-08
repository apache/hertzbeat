/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { refreshBrowserSession } = vi.hoisted(() => ({ refreshBrowserSession: vi.fn().mockResolvedValue(true) }));
vi.mock('@/core/http/http-client', () => ({ refreshBrowserSession }));

import { withCookieHeaderAdmission } from '@/core/http/cookie-header-admission';
import { openMonitorImportTaskStream } from './monitor-import-task-stream';

const payload = '{"schemaVersion":1,"delivery":"CANONICAL_REREAD"}';
let stream: ReturnType<typeof openMonitorImportTaskStream> | undefined;

function visibility(state: DocumentVisibilityState) {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('monitor import task stream', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    visibility('visible');
  });
  afterEach(async () => {
    stream?.close();
    stream = undefined;
    await flush();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('treats ready and task events only as validated canonical-reread triggers', async () => {
    const onCanonicalReread = vi.fn();
    stream = openMonitorImportTaskStream({ onCanonicalReread });
    await flush();
    const source = FakeEventSource.instances[0]!;
    expect(source.path).toBe('/api/manager/sse/subscribe');
    source.emit('manager-ready', payload);
    source.emit('IMPORT_TASK_EVENT', payload);
    source.emit('IMPORT_TASK_EVENT', '{"status":"COMPLETED"}');
    expect(onCanonicalReread.mock.calls).toEqual([['manager-ready'], ['IMPORT_TASK_EVENT']]);
  });

  it('releases a hidden tab connection and rereads canonically on visible resume', async () => {
    const onCanonicalReread = vi.fn();
    stream = openMonitorImportTaskStream({ onCanonicalReread });
    await flush();
    const first = FakeEventSource.instances[0]!;
    visibility('hidden');
    expect(first.close).toHaveBeenCalledOnce();
    first.emit('IMPORT_TASK_EVENT', payload);
    first.onopen?.();
    first.onerror?.();
    expect(refreshBrowserSession).not.toHaveBeenCalled();
    expect(onCanonicalReread).not.toHaveBeenCalled();

    visibility('visible');
    visibility('visible');
    await flush();
    expect(FakeEventSource.instances).toHaveLength(2);
    first.emit('IMPORT_TASK_EVENT', payload);
    expect(onCanonicalReread).not.toHaveBeenCalled();
    FakeEventSource.instances[1]!.emit('manager-ready', payload);
    expect(onCanonicalReread).toHaveBeenCalledExactlyOnceWith('manager-ready');
  });

  it('does not open while initially hidden or reconnect after final close', async () => {
    visibility('hidden');
    stream = openMonitorImportTaskStream({ onCanonicalReread: vi.fn() });
    expect(FakeEventSource.instances).toHaveLength(0);
    visibility('visible');
    await flush();
    expect(FakeEventSource.instances).toHaveLength(1);
    stream.close();
    visibility('hidden');
    visibility('visible');
    await flush();
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0]!.close).toHaveBeenCalledOnce();
  });

  it('retires native retry and pending session recovery while hidden', async () => {
    let complete!: (value: boolean) => void;
    refreshBrowserSession.mockReturnValueOnce(
      new Promise<boolean>(resolve => {
        complete = resolve;
      })
    );
    stream = openMonitorImportTaskStream({ onCanonicalReread: vi.fn() });
    await flush();
    FakeEventSource.instances[0]!.onerror?.();
    await flush();
    expect(refreshBrowserSession).toHaveBeenCalledOnce();
    visibility('hidden');
    complete(true);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(FakeEventSource.instances).toHaveLength(1);
    visibility('visible');
    await flush();
    expect(FakeEventSource.instances).toHaveLength(2);

    FakeEventSource.instances[1]!.onerror?.();
    await vi.advanceTimersByTimeAsync(0);
    visibility('hidden');
    await vi.advanceTimersByTimeAsync(20_000);
    expect(FakeEventSource.instances).toHaveLength(2);
  });

  it('retires queued construction when visibility hides before admission', async () => {
    let release!: () => void;
    const writer = withCookieHeaderAdmission(
      'exclusive',
      () =>
        new Promise<void>(resolve => {
          release = resolve;
        })
    );
    await flush();
    const onCanonicalReread = vi.fn();
    stream = openMonitorImportTaskStream({ onCanonicalReread });
    visibility('hidden');
    release();
    await writer;
    await flush();
    expect(FakeEventSource.instances).toHaveLength(0);
    expect(onCanonicalReread).not.toHaveBeenCalled();
    visibility('visible');
    await flush();
    expect(FakeEventSource.instances).toHaveLength(1);
  });
});

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
  emit(name: string, data: string) {
    this.listeners.get(name)?.(new MessageEvent(name, { data }));
  }
}

async function flush() {
  for (let i = 0; i < 24; i += 1) await Promise.resolve();
}
