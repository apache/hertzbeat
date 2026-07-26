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

import { AlertRequestFailure, type AlertQuery } from '../model/alert-model';
import { useShellAlertNotificationController } from './use-shell-alert-notification-controller';

const api = vi.hoisted(() => ({
  loadAlertGroups: vi.fn(),
  loadAlertSummary: vi.fn(),
  openAlertGroupStream: vi.fn()
}));

vi.mock('../api/alert-api', () => api);

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

function renderController() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(useShellAlertNotificationController, { wrapper });
}
