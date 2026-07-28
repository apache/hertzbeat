/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BrowserAlertNotificationRuntime } from '@/core/notification/browser-alert-notification';

import { AlertRequestFailure, type AlertQuery } from '../model/alert-model';
import { shellAlertNotificationQueryKeys } from './shell-alert-notification-query-keys';
import { useShellAlertNotificationController } from './use-shell-alert-notification-controller';

const api = vi.hoisted(() => ({
  loadAlertGroups: vi.fn(),
  loadAlertSummary: vi.fn(),
  openAlertGroupStream: vi.fn()
}));
const soundApi = vi.hoisted(() => ({
  loadShellAlertMute: vi.fn(),
  saveShellAlertMute: vi.fn()
}));

vi.mock('../api/alert-api', () => api);
vi.mock('../api/shell-alert-notification-api', () => soundApi);

const notificationRuntime: BrowserAlertNotificationRuntime = {
  readPermission: vi.fn(),
  requestPermission: vi.fn(),
  show: vi.fn(),
  playSound: vi.fn()
};
const openAlerts = vi.fn();
let canonicalMuted = true;

describe('shell alert notification controller', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    api.loadAlertSummary.mockResolvedValue({
      total: 9,
      dealNum: 6,
      rate: 66.67,
      priorityWarningNum: 0,
      priorityCriticalNum: 3,
      priorityEmergencyNum: 0
    });
    api.loadAlertGroups.mockImplementation((query: AlertQuery) =>
      Promise.resolve({
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: query.pageIndex,
        size: query.pageSize
      })
    );
    api.openAlertGroupStream.mockReturnValue({ close: vi.fn() });
    canonicalMuted = true;
    soundApi.loadShellAlertMute.mockImplementation(() => Promise.resolve({ muted: canonicalMuted }));
    soundApi.saveShellAlertMute.mockImplementation((muted: boolean) => {
      canonicalMuted = muted;
      return Promise.resolve();
    });
    vi.mocked(notificationRuntime.readPermission).mockReturnValue('default');
    vi.mocked(notificationRuntime.requestPermission).mockResolvedValue('granted');
    openAlerts.mockReset();
  });

  afterEach(() => vi.useRealTimers());

  it('loads an exact firing preview and forwards query cancellation', async () => {
    const { result } = renderController();

    await waitFor(() => expect(result.current.count).toEqual({ kind: 'ready', total: 3 }));
    expect(result.current.list).toEqual({ kind: 'empty' });
    expect(api.loadAlertGroups).toHaveBeenCalledWith(
      {
        search: '',
        status: 'firing',
        severity: '',
        serviceName: '',
        serviceNamespace: '',
        environment: '',
        pageIndex: 0,
        pageSize: 8
      },
      expect.any(AbortSignal)
    );
    expect(api.loadAlertSummary).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it('keeps an authoritative count when the preview list is unavailable', async () => {
    api.loadAlertGroups.mockRejectedValue(new AlertRequestFailure('unavailable'));
    const { result } = renderController();

    await waitFor(() => expect(result.current.list).toEqual({ kind: 'unavailable' }));
    expect(result.current.count).toEqual({ kind: 'ready', total: 3 });
  });

  it('does not expose a negative active count from an inconsistent summary snapshot', async () => {
    api.loadAlertSummary.mockResolvedValue({
      total: 2,
      dealNum: 3,
      rate: 100,
      priorityWarningNum: 0,
      priorityCriticalNum: 0,
      priorityEmergencyNum: 0
    });
    const { result } = renderController();

    await waitFor(() => expect(result.current.count).toEqual({ kind: 'ready', total: 0 }));
  });

  it('requests browser permission only from explicit unmute and persists the server setting', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.sound).toMatchObject({ kind: 'ready', muted: true }));
    expect(notificationRuntime.requestPermission).not.toHaveBeenCalled();

    await act(async () => result.current.toggleSound());

    expect(notificationRuntime.requestPermission).toHaveBeenCalledOnce();
    expect(soundApi.saveShellAlertMute).toHaveBeenCalledWith(false);
    await waitFor(() =>
      expect(result.current.sound).toMatchObject({ kind: 'ready', muted: false, permission: 'granted' })
    );
    await act(async () => result.current.toggleSound());

    expect(notificationRuntime.requestPermission).toHaveBeenCalledOnce();
    expect(soundApi.saveShellAlertMute.mock.calls).toEqual([[false], [true]]);
    await waitFor(() => expect(result.current.sound).toMatchObject({ kind: 'ready', muted: true }));
    expect(api.openAlertGroupStream).toHaveBeenCalledTimes(1);
  });

  it.each([['USER'], ['GUEST']] as const)(
    'keeps the canonical mute state readable but refuses a %s toggle',
    async role => {
      const { result } = renderController([role]);
      await waitFor(() => expect(result.current.sound).toMatchObject({ kind: 'ready', muted: true }));

      expect(result.current.sound).toMatchObject({ canToggle: false });
      await act(async () => result.current.toggleSound());

      expect(notificationRuntime.requestPermission).not.toHaveBeenCalled();
      expect(soundApi.saveShellAlertMute).not.toHaveBeenCalled();
    }
  );

  it('retires a captured ADMIN toggle synchronously after role downgrade', async () => {
    const { result, rerender } = renderController();
    await waitFor(() => expect(result.current.sound).toMatchObject({ kind: 'ready', canToggle: true }));
    const retainedToggle = result.current.toggleSound;

    rerender({ roles: ['USER'] });
    await waitFor(() => expect(result.current.sound).toMatchObject({ kind: 'ready', canToggle: false }));
    await act(async () => retainedToggle());

    expect(notificationRuntime.requestPermission).not.toHaveBeenCalled();
    expect(soundApi.saveShellAlertMute).not.toHaveBeenCalled();
  });

  it('retires permission-await work before a downgrade can issue POST', async () => {
    const permission = deferred<NotificationPermission>();
    vi.mocked(notificationRuntime.requestPermission).mockReturnValue(permission.promise);
    const { result, rerender } = renderController();
    await waitFor(() => expect(result.current.sound).toMatchObject({ kind: 'ready', muted: true }));

    let toggle!: Promise<void>;
    act(() => {
      toggle = result.current.toggleSound();
    });
    await waitFor(() => expect(notificationRuntime.requestPermission).toHaveBeenCalledOnce());
    rerender({ roles: ['GUEST'] });
    permission.resolve('granted');
    await act(async () => toggle);

    expect(soundApi.saveShellAlertMute).not.toHaveBeenCalled();
    expect(result.current.sound).toMatchObject({
      kind: 'ready',
      canToggle: false,
      muted: true,
      saving: false,
      failure: null
    });
  });

  it.each(['resolve', 'reject'] as const)(
    'converges through canonical GET after a late POST %s and role downgrade',
    async completion => {
      const post = deferred<void>();
      soundApi.saveShellAlertMute.mockReturnValue(post.promise);
      const { client, result, rerender } = renderController();
      await waitFor(() => expect(result.current.sound).toMatchObject({ kind: 'ready', muted: true }));

      let toggle!: Promise<void>;
      act(() => {
        toggle = result.current.toggleSound();
      });
      await waitFor(() => expect(soundApi.saveShellAlertMute).toHaveBeenCalledWith(false));
      rerender({ roles: ['USER'] });
      canonicalMuted = false;
      if (completion === 'resolve') post.resolve();
      else post.reject(new AlertRequestFailure('error', 'rejected'));
      await act(async () => toggle);

      await waitFor(() => expect(soundApi.loadShellAlertMute).toHaveBeenCalledTimes(2));
      expect(client.getQueryData(shellAlertNotificationQueryKeys.mute())).toEqual({ muted: false });
      expect(result.current.sound).toMatchObject({
        kind: 'ready',
        canToggle: false,
        muted: false,
        saving: false,
        failure: null
      });
    }
  );

  it('refuses a captured ADMIN toggle after unmount', async () => {
    const { result, unmount } = renderController();
    await waitFor(() => expect(result.current.sound).toMatchObject({ kind: 'ready', muted: true }));
    const retainedToggle = result.current.toggleSound;

    unmount();
    await act(async () => retainedToggle());

    expect(notificationRuntime.requestPermission).not.toHaveBeenCalled();
    expect(soundApi.saveShellAlertMute).not.toHaveBeenCalled();
  });

  it('does not publish a late POST completion after unmount', async () => {
    const post = deferred<void>();
    soundApi.saveShellAlertMute.mockReturnValue(post.promise);
    const { client, result, unmount } = renderController();
    await waitFor(() => expect(result.current.sound).toMatchObject({ kind: 'ready', muted: true }));

    let toggle!: Promise<void>;
    act(() => {
      toggle = result.current.toggleSound();
    });
    await waitFor(() => expect(soundApi.saveShellAlertMute).toHaveBeenCalledOnce());
    unmount();
    post.resolve();
    await act(async () => toggle);

    expect(soundApi.loadShellAlertMute).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(shellAlertNotificationQueryKeys.mute())).toEqual({ muted: true });
  });

  it('aborts canonical GET and suppresses its late cache write after unmount', async () => {
    const canonical = deferred<{ muted: boolean }>();
    let canonicalSignal: AbortSignal | undefined;
    soundApi.loadShellAlertMute.mockResolvedValueOnce({ muted: true }).mockImplementationOnce((signal: AbortSignal) => {
      canonicalSignal = signal;
      return canonical.promise;
    });
    const { client, result, unmount } = renderController();
    await waitFor(() => expect(result.current.sound).toMatchObject({ kind: 'ready', muted: true }));

    let toggle!: Promise<void>;
    act(() => {
      toggle = result.current.toggleSound();
    });
    await waitFor(() => expect(soundApi.loadShellAlertMute).toHaveBeenCalledTimes(2));
    unmount();
    canonical.resolve({ muted: false });
    await act(async () => toggle);

    expect(canonicalSignal?.aborted).toBe(true);
    expect(client.getQueryData(shellAlertNotificationQueryKeys.mute())).toEqual({ muted: true });
  });

  it('uses current canonical mute evidence when an old toggle callback runs', async () => {
    const { client, result } = renderController();
    await waitFor(() => expect(result.current.sound).toMatchObject({ kind: 'ready', muted: true }));
    const retainedToggle = result.current.toggleSound;
    act(() => {
      client.setQueryData(shellAlertNotificationQueryKeys.mute(), { muted: false });
    });
    await waitFor(() => expect(result.current.sound).toMatchObject({ kind: 'ready', muted: false }));

    await act(async () => retainedToggle());

    expect(soundApi.saveShellAlertMute).toHaveBeenCalledWith(true);
    expect(notificationRuntime.requestPermission).not.toHaveBeenCalled();
  });

  it('converges a legal POST through canonical GET instead of its request parameter', async () => {
    soundApi.saveShellAlertMute.mockResolvedValue(undefined);
    const { result } = renderController();
    await waitFor(() => expect(result.current.sound).toMatchObject({ kind: 'ready', muted: true }));

    await act(async () => result.current.toggleSound());

    expect(soundApi.saveShellAlertMute).toHaveBeenCalledWith(false);
    expect(soundApi.loadShellAlertMute).toHaveBeenCalledTimes(2);
    expect(soundApi.loadShellAlertMute).toHaveBeenLastCalledWith(expect.any(AbortSignal));
    expect(result.current.sound).toMatchObject({ kind: 'ready', muted: true, saving: false, failure: null });
  });

  it('notifies once per firing group while unmuted without retaining alert content', async () => {
    soundApi.loadShellAlertMute.mockResolvedValue({ muted: false });
    vi.mocked(notificationRuntime.readPermission).mockReturnValue('granted');
    let handlers: { onAlert: (event: { id: number; status: 'firing' | 'resolved' } | null) => void } | undefined;
    api.openAlertGroupStream.mockImplementation(next => {
      handlers = next;
      return { close: vi.fn() };
    });
    renderController();
    await waitFor(() => expect(soundApi.loadShellAlertMute).toHaveBeenCalledOnce());

    act(() => {
      handlers?.onAlert({ id: 7, status: 'firing' });
      handlers?.onAlert({ id: 7, status: 'firing' });
      handlers?.onAlert({ id: 8, status: 'resolved' });
      handlers?.onAlert(null);
    });

    expect(notificationRuntime.playSound).toHaveBeenCalledOnce();
    expect(notificationRuntime.playSound).toHaveBeenCalledWith('/assets/audio/default-alert-EN.mp3');
    expect(notificationRuntime.show).toHaveBeenCalledOnce();
    const shown = vi.mocked(notificationRuntime.show).mock.calls[0]?.[0];
    expect(shown).toMatchObject({
      title: 'HertzBeat alert',
      body: 'A new active alert needs attention.',
      icon: '/assets/logo.svg'
    });
    shown?.onClick();
    expect(openAlerts).toHaveBeenCalledOnce();
  });

  it('keeps a failed or unavailable server setting honest and safely muted', async () => {
    soundApi.loadShellAlertMute.mockRejectedValueOnce(new AlertRequestFailure('unavailable'));
    const unavailable = renderController();
    await waitFor(() => expect(unavailable.result.current.sound).toEqual({ kind: 'unavailable' }));
    await act(async () => unavailable.result.current.toggleSound());
    expect(soundApi.saveShellAlertMute).not.toHaveBeenCalled();
    unavailable.unmount();

    soundApi.loadShellAlertMute.mockResolvedValueOnce({ muted: true });
    soundApi.saveShellAlertMute.mockRejectedValueOnce(new AlertRequestFailure('error', 'rejected'));
    const failed = renderController();
    await waitFor(() => expect(failed.result.current.sound).toMatchObject({ kind: 'ready', muted: true }));
    await act(async () => failed.result.current.toggleSound());
    expect(failed.result.current.sound).toMatchObject({ kind: 'ready', muted: true, failure: 'save_failed' });
  });

  it('makes the shell the realtime refresh owner for shared Alert Center queries', async () => {
    let handlers:
      | {
          onAlert: () => void;
        }
      | undefined;
    api.openAlertGroupStream.mockImplementation(next => {
      handlers = next;
      return { close: vi.fn() };
    });
    renderController();
    await waitFor(() => expect(api.loadAlertGroups).toHaveBeenCalledTimes(1));

    act(() => handlers?.onAlert());
    await act(async () => vi.advanceTimersByTimeAsync(250));

    await waitFor(() => expect(api.loadAlertGroups).toHaveBeenCalledTimes(2));
    expect(api.loadAlertSummary).toHaveBeenCalledTimes(2);
  });
});

function renderController(roles = ['ADMIN']) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const rendered = renderHook(
    ({ roles: currentRoles }) =>
      useShellAlertNotificationController({
        locale: 'en-US',
        notificationTitle: 'HertzBeat alert',
        notificationBody: 'A new active alert needs attention.',
        onOpenAlerts: openAlerts,
        runtime: notificationRuntime,
        roles: currentRoles
      }),
    { initialProps: { roles }, wrapper }
  );
  return { ...rendered, client };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
