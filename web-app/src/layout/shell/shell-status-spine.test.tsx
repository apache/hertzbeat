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

import { cleanup, render, screen } from '@testing-library/react';
import type { TFunction } from 'i18next';
import { afterEach, describe, expect, it } from 'vitest';

import { ShellStatusSpine } from './shell-status-spine';

const t = ((key: string, options?: Record<string, unknown>) =>
  options ? `${key}:${Object.values(options).join('|')}` : key) as TFunction;

describe('ShellStatusSpine', () => {
  afterEach(cleanup);

  it('shows authoritative status, timestamps, counts, and section reason', () => {
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
    expect(screen.getByTestId('shell-status-greptime')).toHaveAttribute('data-status', 'degraded');
    expect(screen.getByTestId('shell-status-greptime')).toHaveTextContent('shell.status.reason.storage_query_failed');
    expect(screen.getAllByText(/shell\.status\.snapshotObservedAt:/)).toHaveLength(3);
    expect(screen.getByTestId('shell-status-server')).not.toHaveTextContent('shell.status.collectorLastReportedAt:');
    expect(screen.getByTestId('shell-status-collector')).toHaveTextContent('shell.status.collectorLastReportedAt:');
    expect(screen.getByTestId('shell-status-collector')).toHaveTextContent('shell.status.collectorCounts:3|3|1');
  });

  it('shows a request failure without inventing backend evidence or counts', () => {
    render(
      <ShellStatusSpine
        locale="en-US"
        t={t}
        runtime={{ state: 'request-failed', snapshot: null, failure: 'permission' }}
      />
    );

    expect(screen.getByTestId('shell-status-server')).toHaveTextContent('shell.status.request.permission');
    expect(screen.getByTestId('shell-status-greptime')).toHaveTextContent('shell.status.request.permission');
    expect(screen.getByTestId('shell-status-collector')).toHaveTextContent('shell.status.request.permission');
    expect(screen.queryByText(/shell\.status\.reason\./)).not.toBeInTheDocument();
    expect(screen.getByTestId('shell-status-collector')).not.toHaveTextContent('shell.status.collectorNotReported');
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('exposes loading and authoritative unknown as distinct states', () => {
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
    expect(screen.getByTestId('shell-status-collector')).not.toHaveTextContent('shell.status.collectorNotReported');
    expect(screen.getByTestId('shell-status-collector')).not.toHaveTextContent('shell.status.collectorCounts:');
  });

  it('labels a missing report only when Collector counts were observed', () => {
    render(
      <ShellStatusSpine
        locale="en-US"
        t={t}
        runtime={{
          state: 'ready',
          snapshot: {
            observedAt: '2026-07-22T01:02:03Z',
            server: { status: 'available', errorCode: null },
            storage: { kind: 'greptime', status: 'available', errorCode: null },
            collectors: {
              status: 'degraded',
              total: 0,
              online: 0,
              runtimeHealthy: 0,
              lastReportedAt: null,
              errorCode: 'collector_status_unavailable'
            }
          }
        }}
      />
    );

    expect(screen.getByTestId('shell-status-collector')).toHaveTextContent('shell.status.collectorNotReported');
  });
});
