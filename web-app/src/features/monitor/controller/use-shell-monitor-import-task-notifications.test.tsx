/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { App } from 'antd';
import { act, renderHook } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import type { PropsWithChildren } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

const stream = vi.hoisted(() => ({
  close: vi.fn(),
  handlers: undefined as
    | {
        onTask: (event: { kind: 'progress' | 'success' | 'failure'; taskName: string; progress?: number }) => void;
      }
    | undefined,
  openMonitorImportTaskStream: vi.fn(
    (handlers: {
      onTask: (event: { kind: 'progress' | 'success' | 'failure'; taskName: string; progress?: number }) => void;
    }) => {
      stream.handlers = handlers;
      return { close: stream.close };
    }
  )
}));
vi.mock('../api/monitor-import-task-stream', () => ({
  openMonitorImportTaskStream: stream.openMonitorImportTaskStream
}));

import { useShellMonitorImportTaskNotifications } from './use-shell-monitor-import-task-notifications';

describe('shell monitor import task notifications', () => {
  const open = vi.fn();

  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    stream.handlers = undefined;
    vi.spyOn(App, 'useApp').mockReturnValue({
      message: {},
      modal: {},
      notification: { open }
    } as unknown as ReturnType<typeof App.useApp>);
  });

  it('updates one task notification from progress to terminal success and closes the stream on unmount', () => {
    const view = renderHook(() => useShellMonitorImportTaskNotifications(), { wrapper });

    act(() => stream.handlers?.onTask({ kind: 'progress', taskName: 'monitors.json', progress: 40 }));
    act(() => stream.handlers?.onTask({ kind: 'success', taskName: 'monitors.json' }));

    expect(stream.openMonitorImportTaskStream).toHaveBeenCalledOnce();
    expect(open).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        key: 'monitor-import:monitors.json',
        type: 'info',
        duration: 0,
        description: expect.stringContaining('40')
      })
    );
    expect(open).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        key: 'monitor-import:monitors.json',
        type: 'success',
        duration: 4.5
      })
    );

    view.unmount();
    expect(stream.close).toHaveBeenCalledOnce();
  });

  it('uses generic localized failure copy instead of exposing a backend exception body', () => {
    renderHook(() => useShellMonitorImportTaskNotifications(), { wrapper });

    act(() => stream.handlers?.onTask({ kind: 'failure', taskName: 'monitors.xlsx' }));

    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        description: i18n.t('shell.importTasks.failure', { taskName: 'monitors.xlsx' })
      })
    );
    expect(JSON.stringify(open.mock.calls)).not.toContain('errMsg');
  });

  it('leaves the deterministic import workflow usable when the supplemental stream cannot start', () => {
    stream.openMonitorImportTaskStream.mockImplementationOnce(() => {
      throw new Error('EventSource unavailable');
    });

    expect(() => renderHook(() => useShellMonitorImportTaskNotifications(), { wrapper })).not.toThrow();
    expect(open).not.toHaveBeenCalled();
  });
});

function wrapper({ children }: PropsWithChildren) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
