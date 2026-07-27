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

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ShellNavigation } from './shell-navigation';

const refine = vi.hoisted(() => ({
  go: vi.fn(),
  resources: [] as ReturnType<typeof navigationResources>,
  denied: new Set<string>()
}));

vi.mock('@refinedev/core', async importOriginal => ({
  ...(await importOriginal<typeof import('@refinedev/core')>()),
  useCan: ({ resource }: { resource: string }) => ({
    data: refine.denied.has(resource) ? { can: false, reason: 'ROLE_REQUIRED' } : { can: true },
    isLoading: false
  }),
  useGo: () => refine.go,
  useResourceParams: () => ({ resources: refine.resources })
}));
vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({ session: { roles: ['ADMIN'] } })
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('collapsed ShellNavigation', () => {
  beforeEach(() => {
    refine.go.mockReset();
    refine.denied = new Set(['restricted']);
    refine.resources = navigationResources();
  });
  afterEach(cleanup);

  it('opens every route-less root with the shared permitted descendant tree and navigates by mouse', async () => {
    renderNavigation();

    const workspace = groupButton('shell.navigation.workspace');
    const operations = groupButton('shell.navigation.operations');
    const administration = groupButton('shell.navigation.administration');
    [workspace, operations, administration].forEach(button => {
      expect(button).not.toHaveAttribute('aria-haspopup');
      expect(button).toHaveAttribute('aria-controls');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    fireEvent.mouseEnter(workspace);
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(workspace).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(workspace);
    let flyout = await screen.findByRole('navigation', { name: 'shell.navigation.workspace' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(flyout).not.toBeInTheDocument());

    fireEvent.click(workspace);
    flyout = await screen.findByRole('navigation', { name: 'shell.navigation.workspace' });
    const dashboard = within(flyout).getByRole('link', { name: 'menu.dashboard' });
    const monitors = within(flyout).getByRole('link', { name: 'menu.monitors' });
    const restricted = within(flyout).getByRole('link', { name: 'menu.restricted' });
    const preview = within(flyout).getByRole('link', { name: 'menu.preview' });
    expect(dashboard).toHaveAttribute('aria-current', 'page');
    expect(restricted).toHaveAttribute('aria-disabled', 'true');
    expect(preview).toHaveAttribute('aria-disabled', 'true');

    fireEvent.mouseEnter(restricted);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('shell.permission.roleRequired');
    fireEvent.mouseLeave(restricted);
    fireEvent.click(restricted);
    expect(refine.go).not.toHaveBeenCalled();
    fireEvent.click(monitors);
    expect(refine.go).toHaveBeenCalledWith({ to: '/monitors', type: 'push' });
    expect(workspace).toHaveAttribute('aria-expanded', 'false');
    expect(workspace).toHaveFocus();
    await waitFor(() => {
      expect(screen.queryByRole('navigation', { name: 'shell.navigation.workspace' })).not.toBeInTheDocument();
    });
  });

  it('opens by keyboard, focuses the first route, switches groups, and closes with Escape', async () => {
    renderNavigation();
    const operations = groupButton('shell.navigation.operations');
    const administration = groupButton('shell.navigation.administration');

    operations.focus();
    fireEvent.keyDown(operations, { key: 'ArrowRight' });
    const operationsFlyout = screen.getByRole('navigation', { name: 'shell.navigation.operations' });
    const alerts = within(operationsFlyout).getByRole('link', { name: 'menu.alerts' });
    await waitFor(() => expect(alerts).toHaveFocus());
    expect(within(operationsFlyout).getByRole('link', { name: 'alertRules.title' })).toBeInTheDocument();
    fireEvent.click(alerts, { detail: 0 });
    expect(refine.go).toHaveBeenCalledWith({ to: '/alerts', type: 'push' });
    expect(operations).toHaveAttribute('aria-expanded', 'false');
    expect(operations).toHaveFocus();

    fireEvent.keyDown(operations, { key: 'ArrowRight' });
    fireEvent.click(administration);
    await waitFor(() => {
      expect(screen.queryByRole('navigation', { name: 'shell.navigation.operations' })).not.toBeInTheDocument();
    });
    const administrationFlyout = await screen.findByRole('navigation', {
      name: 'shell.navigation.administration'
    });
    const settings = within(administrationFlyout).getByRole('link', { name: 'menu.settings' });
    fireEvent.keyDown(settings, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('navigation', { name: 'shell.navigation.administration' })).not.toBeInTheDocument();
    });
    expect(administration).toHaveFocus();
  });
});

function groupButton(name: string) {
  return screen.getByRole('button', { name });
}

function renderNavigation() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <ShellNavigation collapsed onCollapsedChange={vi.fn()} />
    </MemoryRouter>
  );
}

function navigationResources() {
  return [
    resource('shell-workspace', undefined, undefined, 10),
    resource('shell-operations', undefined, undefined, 20),
    resource('shell-administration', undefined, undefined, 30),
    resource('dashboard', '/dashboard', 'shell-workspace', 10),
    resource('monitors', '/monitors', 'shell-workspace', 20),
    resource('restricted', '/restricted', 'shell-workspace', 30),
    resource('preview', '/preview', 'shell-workspace', 40, 'unknown'),
    resource('alerts', '/alerts', 'shell-operations', 10),
    resource('alert-rules', '/alerts/rules', 'alerts', 10),
    resource('settings', '/settings', 'shell-administration', 10)
  ];
}

function resource(
  name: string,
  list?: string,
  parent?: string,
  order = 0,
  capability: 'supported' | 'unknown' | 'unsupported' = 'supported'
) {
  return {
    name,
    meta: {
      icon: <span>{name}</span>,
      shell: {
        capability,
        labelKey: name.startsWith('shell-') ? `shell.navigation.${name.slice(6)}` : labelKey(name),
        navigation: true,
        order,
        timePolicy: list ? ('unknown' as const) : ('none' as const)
      },
      ...(parent ? { parent } : {})
    },
    ...(list ? { list } : {})
  };
}

function labelKey(name: string) {
  if (name === 'alert-rules') return 'alertRules.title';
  return `menu.${name}`;
}
