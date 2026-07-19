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

import { Refine } from '@refinedev/core';
import routerProvider from '@refinedev/react-router';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AppProviders } from '@/app/providers';
import { refineResources, shellAccessControlProvider } from '@/app/refine/refine-resource-registry';
import { SessionContext } from '@/core/auth/session-context';
import { SessionIdentityProvider } from '@/core/auth/session-identity-provider';
import { initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { BasicLayout } from './basic-layout';
import stylesheet from '../shell/hertzbeat-shell.module.css?raw';

describe('BasicLayout shell', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  afterEach(cleanup);

  it('renders the official logo as one constrained accessible brand identity', () => {
    renderLayout();

    const logo = screen.getByRole('img', { name: 'HertzBeat' });
    expect(logo).toHaveAttribute('src', '/assets/logo.svg');
    expect(logo).toHaveAttribute('width', '24');
    expect(logo).toHaveAttribute('height', '23');
    expect(screen.getByText('HertzBeat')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders an honest status and time spine without fake health', () => {
    renderLayout();

    expect(screen.getByTestId('shell-status-server')).toHaveTextContent('Unknown');
    expect(screen.getByTestId('shell-status-greptime')).toHaveTextContent('Unknown');
    expect(screen.getByTestId('shell-status-collector')).toHaveTextContent('Unknown');
    expect(screen.getByTestId('shell-time-policy')).toHaveTextContent('30m');
    expect(screen.getByRole('button', { name: 'Refresh active data' })).toBeEnabled();
  });

  it('does not render fake shared time or refresh ownership for settings routes', () => {
    renderLayout('/settings/notifications/templates');

    expect(screen.queryByTestId('shell-time-policy')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refresh active data' })).not.toBeInTheDocument();
  });

  it('selects the longest Refine route and supports the 220 to 48 pixel rail', () => {
    renderLayout('/settings/notifications/templates');

    expect(screen.getByRole('link', { name: 'Templates' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('shell-navigation')).toHaveAttribute('data-collapsed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Collapse navigation' }));
    expect(screen.getByTestId('shell-navigation')).toHaveAttribute('data-collapsed', 'true');

    const expanded = cssRule('.shell');
    const collapsed = cssRule('.shellCollapsed');
    expect(expanded).toContain('--hb-shell-sidebar-width: 220px');
    expect(collapsed).toContain('--hb-shell-sidebar-width: 48px');
  });

  it('keeps active, hover, and keyboard navigation states visually distinct', () => {
    const link = cssRule('.navigationLink');
    const active = cssRule('.navigationLinkActive');
    const hover = cssRule('.navigationLink:hover');
    const focus = cssRule('.navigationLink:focus-visible');

    expect(link).toContain('border-left: 2px solid transparent');
    expect(active).toContain('border-left-color: var(--hb-brand-accent)');
    expect(active).toContain('border-radius: 0');
    expect(active).toContain('background: var(--hb-nav-selected)');
    expect(active).not.toContain('box-shadow');
    expect(hover).toContain('background: var(--hb-nav-hover)');
    expect(focus).toContain('outline: 2px solid var(--hb-focus-ring)');
  });

  it('contains wide route content inside the work surface without pushing global chrome', () => {
    expect(cssRule('.shell')).toContain('max-width: 100vw');
    expect(cssRule('.shell')).toContain('overflow-x: hidden');
    expect(cssRule('.shellBody')).toContain('min-width: 0');
    expect(cssRule('.shellBody')).toContain('overflow: hidden');
    expect(cssRule('.content')).toContain('min-width: 0');
    expect(cssRule('.content')).toContain('max-width: 100%');
    expect(cssRule('.content')).toContain('overflow-x: auto');
  });
});

function cssRule(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = stylesheet.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!match?.[1]) throw new Error(`Missing CSS rule: ${selector}`);
  return match[1];
}

function renderLayout(path = '/alerts') {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>
        <Refine
          accessControlProvider={shellAccessControlProvider}
          resources={refineResources}
          routerProvider={routerProvider}
          options={{ disableTelemetry: true }}
        >
          <SessionIdentityProvider replaceIdentity={() => undefined}>
            <SessionContext.Provider
              value={{
                loading: false,
                retry: () => undefined,
                session: {
                  authenticated: true,
                  username: 'operator',
                  roles: ['ADMIN'],
                  workspaceId: 'default',
                  expiresAt: null
                },
                unavailable: false
              }}
            >
              <Routes>
                <Route element={<BasicLayout />}>
                  <Route path="/alerts" element={<div>Alerts route</div>} />
                  <Route path="/settings/notifications/templates" element={<div>Templates route</div>} />
                </Route>
              </Routes>
            </SessionContext.Provider>
          </SessionIdentityProvider>
        </Refine>
      </MemoryRouter>
    </AppProviders>
  );
}
