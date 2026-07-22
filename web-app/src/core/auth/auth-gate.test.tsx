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
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SessionContext } from './session-context';
import { sessionLockStorageKey } from './session-lock-storage';
import { AuthGate } from './auth-gate';

describe('AuthGate', () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
  });

  it('lets the user retry a failed session request after the backend recovers', () => {
    const retry = vi.fn();
    render(
      <MemoryRouter>
        <SessionContext.Provider value={{ failure: 'unavailable', loading: false, retry, session: undefined }}>
          <AuthGate />
        </SessionContext.Provider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(retry).toHaveBeenCalledOnce();
  });

  it.each([
    ['unavailable', 'common.unavailable'],
    ['contract', 'common.routeError.description'],
    ['error', 'common.routeError.title']
  ] as const)('keeps a direct protected entry in place for a retryable %s session failure', (failure, message) => {
    const retry = vi.fn();
    render(
      <MemoryRouter initialEntries={['/dashboard?view=operations']}>
        <SessionContext.Provider value={{ failure, loading: false, retry, session: undefined }}>
          <AuthGate />
          <LocationProbe />
        </SessionContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveAttribute('data-session-failure', failure);
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard?view=operations');
    fireEvent.click(screen.getByRole('button'));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('copies only a sanitized local direct-entry target into the anonymous login redirect', () => {
    render(
      <MemoryRouter
        initialEntries={['/explore?serviceName=checkout&access_token=must-not-leak#?tab=logs&apiKey=also-secret']}
      >
        <SessionContext.Provider value={{ loading: false, retry: vi.fn(), session: undefined }}>
          <Routes>
            <Route element={<AuthGate />}>
              <Route path="/explore" element={<div>protected</div>} />
            </Route>
            <Route path="/passport/login" element={<LocationProbe />} />
          </Routes>
        </SessionContext.Provider>
      </MemoryRouter>
    );

    const href = screen.getByTestId('location').textContent ?? '';
    const redirect = new URL(href, 'https://hertzbeat.local').searchParams.get('redirect');
    expect(redirect).toBe('/explore?serviceName=checkout#?tab=logs');
    expect(href).not.toContain('must-not-leak');
    expect(href).not.toContain('also-secret');
  });

  it.each([
    JSON.stringify({ version: 1, username: 'operator', workspaceId: 'workspace-a', returnTo: '/dashboard' }),
    '{malformed',
    JSON.stringify({ version: 1, username: 'other', workspaceId: 'workspace-a', returnTo: '/dashboard' })
  ])('blocks manual protected URLs after reload for valid, malformed, or mismatched lock evidence', marker => {
    window.sessionStorage.setItem(sessionLockStorageKey, marker);
    render(
      <MemoryRouter initialEntries={['/explore?signal=logs']}>
        <SessionContext.Provider
          value={{
            loading: false,
            retry: vi.fn(),
            session: {
              authenticated: true,
              username: 'operator',
              workspaceId: 'workspace-a',
              roles: ['ADMIN'],
              expiresAt: null
            }
          }}
        >
          <Routes>
            <Route element={<AuthGate />}>
              <Route path="/explore" element={<div>protected content</div>} />
            </Route>
            <Route path="/passport/lock" element={<LocationProbe />} />
          </Routes>
        </SessionContext.Provider>
      </MemoryRouter>
    );

    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/passport/lock');
  });
});

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output>;
}
