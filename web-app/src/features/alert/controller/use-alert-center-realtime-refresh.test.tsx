/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ openAlertGroupStream: vi.fn() }));
vi.mock('../api/alert-api', () => ({ openAlertGroupStream: api.openAlertGroupStream }));

import { useAlertCenterRealtimeRefresh } from './use-alert-center-realtime-refresh';

describe('Alert Center realtime refresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    FakeStream.instances = [];
    api.openAlertGroupStream.mockImplementation((handlers: StreamHandlers) => new FakeStream(handlers));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces an alert burst into one authoritative refresh', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useAlertCenterRealtimeRefresh(refresh));
    const stream = FakeStream.instances[0]!;

    act(() => {
      stream.alert();
      stream.alert();
      stream.alert();
    });
    expect(refresh).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(250));

    expect(refresh).toHaveBeenCalledOnce();
  });

  it('reconciles on native open and mutation without projecting mutation as an alert', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const onAlert = vi.fn();
    renderHook(() => useAlertCenterRealtimeRefresh(refresh, onAlert));
    const stream = FakeStream.instances[0]!;

    act(() => stream.open());
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(refresh).toHaveBeenCalledOnce();

    act(() => stream.mutation());
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(onAlert).not.toHaveBeenCalled();
  });

  it('keeps polling when an exhausted stream reports a late open', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useAlertCenterRealtimeRefresh(refresh));
    const stream = FakeStream.instances[0]!;

    act(() => stream.unavailable());
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(refresh).toHaveBeenCalledOnce();

    await act(async () => vi.advanceTimersByTimeAsync(30_000));
    expect(refresh).toHaveBeenCalledTimes(2);

    act(() => stream.open());
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(refresh).toHaveBeenCalledTimes(4);
  });

  it('periodically rebuilds one exhausted stream and stops polling when the replacement opens', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useAlertCenterRealtimeRefresh(refresh));
    const exhausted = FakeStream.instances[0]!;

    act(() => exhausted.unavailable());
    await act(async () => vi.advanceTimersByTimeAsync(5 * 60_000));

    expect(FakeStream.instances).toHaveLength(2);
    expect(exhausted.close).toHaveBeenCalledOnce();
    const replacement = FakeStream.instances[1]!;
    act(() => replacement.open());
    await act(async () => vi.advanceTimersByTimeAsync(250));
    const callsAfterOpen = refresh.mock.calls.length;
    await act(async () => vi.advanceTimersByTimeAsync(5 * 60_000));

    expect(FakeStream.instances).toHaveLength(2);
    expect(refresh).toHaveBeenCalledTimes(callsAfterOpen);
  });

  it('retires an exhausted generation immediately so only its replacement can recover polling', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const onAlert = vi.fn();
    renderHook(() => useAlertCenterRealtimeRefresh(refresh, onAlert));
    const exhausted = FakeStream.instances[0]!;

    act(() => exhausted.unavailable());
    await act(async () => vi.advanceTimersByTimeAsync(250));
    act(() => {
      exhausted.open();
      exhausted.alert();
      exhausted.mutation();
    });
    await act(async () => vi.advanceTimersByTimeAsync(30_000));

    expect(onAlert).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledTimes(2);

    await act(async () => vi.advanceTimersByTimeAsync(4 * 60_000 + 30_000));
    const replacement = FakeStream.instances[1]!;
    act(() => replacement.open());
    await act(async () => vi.advanceTimersByTimeAsync(250));
    const callsAfterReplacementOpen = refresh.mock.calls.length;
    await act(async () => vi.advanceTimersByTimeAsync(60_000));

    expect(refresh).toHaveBeenCalledTimes(callsAfterReplacementOpen);
  });

  it('deduplicates circuit-breaker reconnects and cancels them on unmount', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const view = renderHook(() => useAlertCenterRealtimeRefresh(refresh));
    const exhausted = FakeStream.instances[0]!;

    act(() => {
      exhausted.unavailable();
      exhausted.unavailable();
    });
    await act(async () => vi.advanceTimersByTimeAsync(5 * 60_000));
    expect(FakeStream.instances).toHaveLength(2);

    const replacement = FakeStream.instances[1]!;
    act(() => replacement.unavailable());
    view.unmount();
    expect(replacement.close).toHaveBeenCalledOnce();
    await act(async () => vi.advanceTimersByTimeAsync(10 * 60_000));

    expect(FakeStream.instances).toHaveLength(2);
  });

  it('serializes a trailing refresh and closes all work on unmount', async () => {
    const first = deferred<void>();
    const refresh = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(undefined);
    const view = renderHook(() => useAlertCenterRealtimeRefresh(refresh));
    const stream = FakeStream.instances[0]!;

    act(() => stream.alert());
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(refresh).toHaveBeenCalledOnce();

    act(() => stream.alert());
    act(() => first.resolve());
    await act(async () => {
      await first.promise;
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(refresh).toHaveBeenCalledTimes(2);

    view.unmount();
    expect(stream.close).toHaveBeenCalledOnce();
    act(() => stream.alert());
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('falls back to polling when stream construction fails', async () => {
    api.openAlertGroupStream.mockImplementation(() => {
      throw new Error('blocked');
    });
    const refresh = vi.fn().mockRejectedValue(new Error('offline'));

    renderHook(() => useAlertCenterRealtimeRefresh(refresh));
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(refresh).toHaveBeenCalledOnce();
    await act(async () => vi.advanceTimersByTimeAsync(30_000));
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});

type StreamHandlers = {
  onOpen: () => void;
  onAlert: () => void;
  onMutation: () => void;
  onRetrying: () => void;
  onUnavailable: () => void;
};

class FakeStream {
  static instances: FakeStream[] = [];
  close = vi.fn();

  constructor(private readonly handlers: StreamHandlers) {
    FakeStream.instances.push(this);
  }

  open() {
    this.handlers.onOpen();
  }

  alert() {
    this.handlers.onAlert();
  }

  mutation() {
    this.handlers.onMutation();
  }

  unavailable() {
    this.handlers.onUnavailable();
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
