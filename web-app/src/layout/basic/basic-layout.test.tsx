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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AppProviders } from '@/app/providers';
import { SessionContext } from '@/core/auth/session-context';
import { initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { BasicLayout } from './basic-layout';
import stylesheet from './basic-layout.module.css?raw';


describe('BasicLayout shell', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  it('renders the official logo as one constrained accessible brand identity', () => {
    renderLayout();

    const logo = screen.getByRole('img', { name: 'HertzBeat' });
    expect(logo).toHaveAttribute('src', '/assets/logo.svg');
    expect(logo).toHaveAttribute('width', '28');
    expect(logo).toHaveAttribute('height', '27');
    expect(screen.getByText('HertzBeat')).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps selected, hover, and keyboard focus navigation states visually distinct', () => {
    const selected = cssRule('.sider :global(.ant-menu-item-selected)');
    const hover = cssRule('.sider :global(.ant-menu-item:not(.ant-menu-item-selected):hover)');
    const menuFocus = cssRule('.sider :global(.ant-menu:focus-visible)');
    const activeFocus = cssRuleContaining('.sider :global(.ant-menu:focus-visible .ant-menu-item-active)');
    const selectedFocus = cssRuleContaining(
      '.sider :global(.ant-menu:focus-visible:not(:has(.ant-menu-item-active)) .ant-menu-item-selected)'
    );
    const itemFocus = cssRule('.sider :global(.ant-menu-item:focus-visible)');
    const antSelectedBorder = cssRule('.sider :global(.ant-menu-item::after)');

    expect(selected).toContain('border-radius: 1px');
    expect(selected).toContain('background: var(--hb-nav-selected)');
    expect(selected).toContain('var(--hb-nav-indicator)');
    expect(selected).not.toContain('#6f83f7');
    expect(hover).toContain('background: var(--hb-nav-hover)');
    expect(menuFocus).toContain('outline: none');
    expect(activeFocus).toContain('outline: 2px solid var(--hb-focus-ring) !important');
    expect(activeFocus).toContain('outline-offset: -2px !important');
    expect(selectedFocus).toContain('outline: 2px solid var(--hb-focus-ring) !important');
    expect(itemFocus).toContain('outline: 2px solid var(--hb-focus-ring) !important');
    expect(itemFocus).toContain('outline-offset: -2px !important');
    expect(antSelectedBorder).toContain('display: none');
  });
});

function cssRule(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = stylesheet.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!match?.[1]) throw new Error(`Missing CSS rule: ${selector}`);
  return match[1];
}

function cssRuleContaining(selector: string) {
  const selectorOffset = stylesheet.indexOf(selector);
  if (selectorOffset < 0) throw new Error(`Missing CSS selector: ${selector}`);
  const blockStart = stylesheet.indexOf('{', selectorOffset);
  const blockEnd = stylesheet.indexOf('}', blockStart);
  if (blockStart < 0 || blockEnd < 0) throw new Error(`Missing CSS block: ${selector}`);
  return stylesheet.slice(blockStart + 1, blockEnd);
}

function renderLayout() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AppProviders>
        <SessionContext.Provider value={{
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
        }}>
          <MemoryRouter initialEntries={['/alerts']}>
            <Routes>
              <Route element={<BasicLayout />}>
                <Route path="/alerts" element={<div>Alerts route</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </SessionContext.Provider>
      </AppProviders>
    </QueryClientProvider>
  );
}
