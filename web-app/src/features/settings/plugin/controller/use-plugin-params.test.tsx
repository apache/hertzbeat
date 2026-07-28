/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode, type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }));
vi.mock('../api/plugin-api', async () => ({
  ...(await vi.importActual<typeof import('../api/plugin-api')>('../api/plugin-api')),
  loadPluginParams: api.load,
  savePluginParams: api.save
}));

import { PluginRequestError } from '../api/plugin-api';
import { usePluginParams } from './use-plugin-params';

const plugin = { id: 7, name: 'audit', enableStatus: true, paramCount: 2 };
const response = {
  paramDefines: [
    { field: 'host', type: 'host', name: {}, required: true, options: [], hide: false, depend: {} },
    { field: 'secret', type: 'password', name: {}, required: true, options: [], hide: false, depend: {} }
  ],
  pluginParams: [
    { field: 'host', type: 'host', value: 'localhost', configured: true },
    { field: 'secret', type: 'password', configured: true }
  ]
} as const;

describe('usePluginParams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.load.mockResolvedValue(response);
    api.save.mockResolvedValue(true);
  });

  it('loads, cancels without writing, and denies read-only admission', async () => {
    const changed = vi.fn();
    const { result } = renderHook(() => usePluginParams(true, changed));
    await act(() => result.current.actions.open(plugin));
    expect(result.current.editor?.draft?.passwords.secret).toEqual({ intent: 'KEEP', value: '', canKeep: true });
    await act(() => result.current.actions.cancel());
    expect(result.current.editor).toBeNull();
    expect(api.save).not.toHaveBeenCalled();

    const reader = renderHook(() => usePluginParams(false, changed));
    await act(() => reader.result.current.actions.open(plugin));
    expect(api.load).toHaveBeenCalledTimes(1);
  });

  it('saves explicit password intent and clears replacement material on leave', async () => {
    const changed = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePluginParams(true, changed));
    await act(() => result.current.actions.open(plugin));
    act(() =>
      result.current.actions.updatePassword('secret', { intent: 'REPLACE', value: 'transient-secret', canKeep: true })
    );
    await act(() => result.current.actions.save());
    expect(api.save).toHaveBeenCalledWith({
      pluginMetadataId: 7,
      params: [
        { field: 'host', value: 'localhost' },
        { field: 'secret', intent: 'REPLACE', value: 'transient-secret' }
      ]
    });
    expect(result.current.editor).toBeNull();
    expect(JSON.stringify(result.current)).not.toContain('transient-secret');
  });

  it('keeps a redacted stable server validation failure without exposing a password', async () => {
    api.save.mockRejectedValue(new PluginRequestError('error'));
    const { result } = renderHook(() => usePluginParams(true, vi.fn()));
    await act(() => result.current.actions.open(plugin));
    act(() =>
      result.current.actions.updatePassword('secret', { intent: 'REPLACE', value: 'failure-secret', canKeep: true })
    );
    await act(() => result.current.actions.save());
    await waitFor(() => expect(result.current.failure).toBe('error'));
    expect(JSON.stringify(result.current)).not.toContain('failure-secret');
  });

  it('closes after a successful write even when list refresh later fails', async () => {
    const changed = vi.fn().mockRejectedValue(new Error('refresh failed'));
    const { result } = renderHook(() => usePluginParams(true, changed));
    await act(() => result.current.actions.open(plugin));
    await act(() => result.current.actions.save());
    expect(api.save).toHaveBeenCalledOnce();
    expect(result.current.editor).toBeNull();
    expect(result.current.failure).toBeNull();
  });

  it('proves an uncertain preserve-only write by canonical parameter reread', async () => {
    api.save.mockRejectedValue(new PluginRequestError('unavailable', 'uncertain'));
    api.load.mockResolvedValue(response);
    const changed = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePluginParams(true, changed));
    await act(() => result.current.actions.open(plugin));

    await act(() => result.current.actions.save());

    expect(api.save).toHaveBeenCalledOnce();
    expect(api.load).toHaveBeenCalledTimes(2);
    expect(result.current.editor).toBeNull();
    expect(result.current.failure).toBeNull();
  });

  it('does not claim proof for an uncertain password replacement and clears its plaintext', async () => {
    api.save.mockRejectedValue(new PluginRequestError('unavailable', 'uncertain'));
    const { result } = renderHook(() => usePluginParams(true, vi.fn()));
    await act(() => result.current.actions.open(plugin));
    act(() =>
      result.current.actions.updatePassword('secret', { intent: 'REPLACE', value: 'transient-secret', canKeep: true })
    );

    await act(() => result.current.actions.save());

    expect(api.save).toHaveBeenCalledOnce();
    expect(api.load).toHaveBeenCalledOnce();
    expect(result.current.editor?.draft?.passwords.secret?.value).toBe('');
    expect(result.current.failure).toBe('unavailable');
  });

  it('remains live when React Strict Mode replays mount effects', async () => {
    const wrapper = ({ children }: PropsWithChildren) => <StrictMode>{children}</StrictMode>;
    const { result } = renderHook(() => usePluginParams(true, vi.fn()), { wrapper });

    await act(() => result.current.actions.open(plugin));

    expect(result.current.editor?.draft).not.toBeNull();
  });

  it('serializes parameter writes before React can render the busy state', async () => {
    const pending = deferred<true>();
    api.save.mockReturnValue(pending.promise);
    const { result } = renderHook(() => usePluginParams(true, vi.fn()));
    await act(() => result.current.actions.open(plugin));

    let first!: Promise<void>;
    act(() => {
      first = result.current.actions.save();
      void result.current.actions.save();
    });

    expect(api.save).toHaveBeenCalledOnce();
    pending.resolve(true);
    await act(() => first);
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
