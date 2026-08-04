/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SessionContext } from '@/core/auth/session-context';
import { settingsPaths } from '@/shared/settings/settings-routes';

import { SettingsRouteLayout } from './settings-route-layout';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('SettingsRouteLayout', () => {
  afterEach(cleanup);

  it('keeps the active setting in a grouped page-local navigation', () => {
    renderLayout(settingsPaths.collectors, ['ADMIN']);

    const navigation = screen.getByRole('navigation', { name: 'settingsNavigation.ariaLabel' });
    expect(within(navigation).getByText('settingsNavigation.groups.notifications')).toBeInTheDocument();
    expect(within(navigation).getByText('settingsNavigation.groups.collection')).toBeInTheDocument();
    expect(within(navigation).getByText('settingsNavigation.groups.platform')).toBeInTheDocument();
    expect(within(navigation).getByRole('link', { name: 'settingsNavigation.collectors' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByText('collector-page')).toBeInTheDocument();
  });

  it('does not render role-restricted links for a non-admin session', () => {
    renderLayout(settingsPaths.labels, ['USER']);

    expect(screen.queryByRole('link', { name: 'settingsNavigation.tokens' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'settingsNavigation.plugins' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'settingsNavigation.labels' })).toHaveAttribute('aria-current', 'page');
  });
});

function renderLayout(initialEntry: string, roles: string[]) {
  return render(
    <SessionContext.Provider
      value={{
        session: {
          authenticated: true,
          username: 'operator',
          roles,
          workspaceId: 'default',
          expiresAt: null
        },
        loading: false,
        retry: vi.fn()
      }}
    >
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={<SettingsRouteLayout />}>
            <Route path={settingsPaths.collectors} element={<div>collector-page</div>} />
            <Route path={settingsPaths.labels} element={<div>label-page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </SessionContext.Provider>
  );
}
