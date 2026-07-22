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

import { ShellStatusSpine } from './shell-header-presentation';

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
              online: 2,
              runtimeHealthy: 1,
              lastReportedAt: '2026-07-22T01:02:00Z',
              errorCode: null
            }
          }
        }}
      />
    );

    expect(screen.getByTestId('shell-status-server')).toHaveTextContent('shell.status.state.available');
    expect(screen.getByTestId('shell-status-greptime')).toHaveTextContent('shell.status.state.degraded');
    expect(screen.getByTestId('shell-status-greptime')).toHaveTextContent('shell.status.reason.storage_query_failed');
    expect(screen.getAllByText(/shell\.status\.observedAt:/)).toHaveLength(3);
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
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
