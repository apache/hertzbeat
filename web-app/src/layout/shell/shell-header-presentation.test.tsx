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

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { TFunction } from 'i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ShellHeaderActions, ShellStatusSpine } from './shell-header-presentation';

const t = ((key: string, options?: Record<string, unknown>) =>
  options ? `${key}:${Object.values(options).join('|')}` : key) as TFunction;

describe('ShellStatusSpine', () => {
  afterEach(cleanup);

  it('shows authoritative status, observation time, and stable degraded reason in all three slots', () => {
    render(
      <ShellStatusSpine
        locale="en-US"
        t={t}
        runtime={{
          state: 'ready',
          snapshot: {
            observedAt: '2026-07-22T01:02:03Z',
            server: { status: 'available', errorCode: null },
            storage: { kind: 'greptime', status: 'degraded', errorCode: 'storage_query_failed' },
            collectors: {
              status: 'available',
              total: 3,
              online: 3,
              runtimeHealthy: 1,
              lastReportedAt: '2026-07-22T01:02:00Z',
              errorCode: null
            }
          }
        }}
      />
    );

    expect(screen.getByTestId('shell-status-server')).toHaveAttribute('data-status', 'available');
    expect(screen.getByTestId('shell-status-server')).toHaveTextContent('shell.status.state.available');
    expect(screen.getByTestId('shell-status-greptime')).toHaveAttribute('data-status', 'degraded');
    expect(screen.getByTestId('shell-status-collector')).toHaveAttribute('data-status', 'available');
    expect(screen.getByTestId('shell-status-greptime')).toHaveTextContent('shell.status.reason.storage_query_failed');
    expect(screen.getAllByText(/shell\.status\.snapshotObservedAt:/)).toHaveLength(3);
    expect(screen.getByTestId('shell-status-server')).not.toHaveTextContent('shell.status.collectorLastReportedAt:');
    expect(screen.getByTestId('shell-status-collector')).toHaveTextContent('shell.status.collectorLastReportedAt:');
  });

  it('shows explicit unavailable reasons after transport or contract failure without fake counts', () => {
    render(
      <ShellStatusSpine
        locale="en-US"
        t={t}
        runtime={{
          state: 'unavailable',
          snapshot: {
            observedAt: null,
            server: { status: 'unavailable', errorCode: 'server_unavailable' },
            storage: { kind: 'greptime', status: 'unavailable', errorCode: 'storage_unavailable' },
            collectors: {
              status: 'unavailable',
              total: null,
              online: null,
              runtimeHealthy: null,
              lastReportedAt: null,
              errorCode: 'collector_status_unavailable'
            }
          }
        }}
      />
    );

    expect(screen.getByTestId('shell-status-server')).toHaveTextContent('shell.status.reason.server_unavailable');
    expect(screen.getByTestId('shell-status-greptime')).toHaveTextContent('shell.status.reason.storage_unavailable');
    expect(screen.getByTestId('shell-status-collector')).toHaveTextContent(
      'shell.status.reason.collector_status_unavailable'
    );
    expect(screen.getByTestId('shell-status-collector')).toHaveAttribute('data-status', 'unavailable');
    expect(screen.getByTestId('shell-status-collector')).toHaveTextContent('shell.status.collectorNotReported');
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('exposes loading and unknown as stable presentation states', () => {
    const { rerender } = render(
      <ShellStatusSpine locale="en-US" t={t} runtime={{ state: 'loading', snapshot: null }} />
    );

    expect(screen.getByTestId('shell-status-server')).toHaveAttribute('data-status', 'loading');

    rerender(
      <ShellStatusSpine
        locale="en-US"
        t={t}
        runtime={{
          state: 'ready',
          snapshot: {
            observedAt: '2026-07-22T01:02:03Z',
            server: { status: 'unknown', errorCode: null },
            storage: { kind: 'greptime', status: 'unknown', errorCode: null },
            collectors: {
              status: 'unknown',
              total: null,
              online: null,
              runtimeHealthy: null,
              lastReportedAt: null,
              errorCode: null
            }
          }
        }}
      />
    );

    expect(screen.getByTestId('shell-status-server')).toHaveAttribute('data-status', 'unknown');
    expect(screen.getByTestId('shell-status-collector')).toHaveTextContent('shell.status.collectorNotReported');
  });
});

describe('ShellHeaderActions account menu', () => {
  afterEach(cleanup);

  it('keeps Lock in the account menu and dispatches the selected action only', async () => {
    const onLock = vi.fn();
    const onLogout = vi.fn();
    render(
      <ShellHeaderActions
        accountName="operator"
        alertNotifications={{
          count: { kind: 'ready', total: 0 },
          list: { kind: 'empty' },
          sound: { kind: 'ready', muted: true, saving: false, permission: 'default', failure: null },
          toggleSound: vi.fn()
        }}
        loggingOut={false}
        showRefresh={false}
        t={t}
        onRefresh={vi.fn()}
        onOpenAlerts={vi.fn()}
        onOpenSettings={vi.fn()}
        onToggleTheme={vi.fn()}
        onChangeLanguage={vi.fn()}
        onLock={onLock}
        onLogout={onLogout}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'shell.actions.user' }));
    fireEvent.click(await screen.findByText('shell.account.lock'));
    expect(onLock).toHaveBeenCalledOnce();
    expect(onLogout).not.toHaveBeenCalled();
  });
});
