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

import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isRouteErrorResponse } from 'react-router-dom';

import { RouteErrorBoundary } from './route-error-boundary';

const router: { error: unknown; matches: Array<{ id: string }> } = vi.hoisted(() => ({
  error: undefined,
  matches: [{ id: 'application' }, { id: 'monitor-detail' }]
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router-dom', async importOriginal => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useMatches: () => router.matches,
  useRouteError: () => router.error
}));

describe('RouteErrorBoundary', () => {
  beforeEach(() => {
    router.matches = [{ id: 'application' }, { id: 'monitor-detail' }];
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('reports a stable route diagnostic without exposing the Error or its sensitive message', () => {
    const sensitiveMessage = 'Bearer secret-token telemetry-body={"service.name":"checkout"}';
    const error = Object.assign(new Error(sensitiveMessage), {
      response: { data: { token: 'secret-token', payload: 'private-backend-payload' } }
    });
    router.error = error;
    const report = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { unmount } = render(<RouteErrorBoundary />);

    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith('Route rendering failed', {
      category: 'exception',
      routeId: 'monitor-detail'
    });
    expect(report.mock.calls[0]).not.toContain(error);
    expect(report.mock.calls.flat()).not.toContain(sensitiveMessage);
    unmount();
    expect(report).toHaveBeenCalledTimes(1);
  });

  it('keeps only a safe status and rejects an unsafe route id from a route response', () => {
    const sensitivePayload = 'private-backend-payload';
    const response = {
      status: 503,
      statusText: `token=${sensitivePayload}`,
      internal: false,
      data: { telemetryBody: sensitivePayload }
    };
    expect(isRouteErrorResponse(response)).toBe(true);
    router.error = response;
    router.matches = [{ id: 'application' }, { id: `monitor/${sensitivePayload}` }];
    const report = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<RouteErrorBoundary />);

    expect(report).toHaveBeenCalledWith('Route rendering failed', {
      category: 'route-response',
      routeId: 'unknown',
      status: 503
    });
    expect(report.mock.calls[0]).not.toContain(response);
    expect(JSON.stringify(report.mock.calls)).not.toContain(sensitivePayload);
  });
});
