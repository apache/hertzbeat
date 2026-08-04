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
  denied: new Set<string>(),
  roles: ['ADMIN']
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
  useSession: () => ({ session: { roles: refine.roles } })
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('collapsed ShellNavigation', () => {
  beforeEach(() => {
    refine.go.mockReset();
    refine.denied = new Set(['restricted']);
    refine.roles = ['ADMIN'];
    refine.resources = navigationResources();
  });
  afterEach(cleanup);

  it('opens every route-less root with the shared permitted descendant tree and navigates by mouse', async () => {
    renderNavigation();

    const basicMonitoring = groupButton('shell.navigation.basicMonitoring');
    const alerting = groupButton('shell.navigation.alerting');
    const administration = groupButton('shell.navigation.administration');
    [basicMonitoring, alerting, administration].forEach(button => {
      expect(button).not.toHaveAttribute('aria-haspopup');
      expect(button).toHaveAttribute('aria-controls');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    fireEvent.mouseEnter(basicMonitoring);
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(basicMonitoring).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(basicMonitoring);
    let flyout = await screen.findByRole('navigation', { name: 'shell.navigation.basicMonitoring' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(flyout).not.toBeInTheDocument());

    fireEvent.click(basicMonitoring);
    flyout = await screen.findByRole('navigation', { name: 'shell.navigation.basicMonitoring' });
    const monitors = within(flyout).getByRole('link', { name: 'menu.monitors' });
    const restricted = within(flyout).getByRole('link', { name: 'menu.restricted' });
    const preview = within(flyout).getByRole('link', { name: 'menu.preview' });
    expect(restricted).toHaveAttribute('aria-disabled', 'true');
    expect(preview).toHaveAttribute('aria-disabled', 'true');

    fireEvent.mouseEnter(restricted);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('shell.permission.roleRequired');
    fireEvent.mouseLeave(restricted);
    fireEvent.click(restricted);
    expect(refine.go).not.toHaveBeenCalled();
    fireEvent.click(monitors);
    expect(refine.go).toHaveBeenCalledWith({ to: '/monitors', type: 'push' });
    expect(basicMonitoring).toHaveAttribute('aria-expanded', 'false');
    expect(basicMonitoring).toHaveFocus();
    await waitFor(() => {
      expect(screen.queryByRole('navigation', { name: 'shell.navigation.basicMonitoring' })).not.toBeInTheDocument();
    });
  });

  it('opens by keyboard, focuses the first route, switches groups, and closes with Escape', async () => {
    renderNavigation();
    const alerting = groupButton('shell.navigation.alerting');
    const administration = groupButton('shell.navigation.administration');

    alerting.focus();
    fireEvent.keyDown(alerting, { key: 'ArrowRight' });
    const alertingFlyout = screen.getByRole('navigation', { name: 'shell.navigation.alerting' });
    const alerts = within(alertingFlyout).getByRole('link', { name: 'menu.alerts' });
    await waitFor(() => expect(alerts).toHaveFocus());
    expect(within(alertingFlyout).queryByRole('link', { name: 'alertRules.title' })).not.toBeInTheDocument();
    fireEvent.click(alerts, { detail: 0 });
    expect(refine.go).toHaveBeenCalledWith({ to: '/alerts', type: 'push' });
    expect(alerting).toHaveAttribute('aria-expanded', 'false');
    expect(alerting).toHaveFocus();

    fireEvent.keyDown(alerting, { key: 'ArrowRight' });
    fireEvent.click(administration);
    await waitFor(() => {
      expect(screen.queryByRole('navigation', { name: 'shell.navigation.alerting' })).not.toBeInTheDocument();
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

  it('removes an ADMIN-only route when the active session loses that role', async () => {
    const view = renderNavigation();
    fireEvent.click(groupButton('shell.navigation.administration'));
    expect(await screen.findByRole('link', { name: 'menu.admin-proof' })).toBeInTheDocument();

    refine.roles = ['USER'];
    view.rerender(navigationElement());

    await waitFor(() => expect(screen.queryByRole('link', { name: 'menu.admin-proof' })).not.toBeInTheDocument());
  });
});

describe('expanded ShellNavigation', () => {
  beforeEach(() => {
    refine.go.mockReset();
    refine.denied = new Set();
    refine.roles = ['ADMIN'];
    refine.resources = navigationResources();
  });
  afterEach(cleanup);

  it('renders stable product sections as labels and direct destinations without contextual children', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ShellNavigation collapsed={false} onCollapsedChange={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'menu.dashboard' })).toHaveAttribute('aria-current', 'page');
    for (const label of [
      'shell.navigation.basicMonitoring',
      'shell.navigation.applicationObservability',
      'shell.navigation.resources',
      'shell.navigation.alerting',
      'shell.navigation.administration'
    ]) {
      expect(screen.getByText(label)).toHaveAttribute('data-navigation-section-label');
      expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: 'menu.monitors' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'menu.alerts' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'menu.settings' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'alertRules.title' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'menu.tokens' })).not.toBeInTheDocument();
  });
});

function groupButton(name: string) {
  return screen.getByRole('button', { name });
}

function renderNavigation() {
  return render(navigationElement());
}

function navigationElement() {
  return (
    <MemoryRouter initialEntries={['/dashboard']}>
      <ShellNavigation collapsed onCollapsedChange={vi.fn()} />
    </MemoryRouter>
  );
}

function navigationResources() {
  return [
    resource('dashboard', '/dashboard', undefined, 5),
    resource('shell-basic-monitoring', undefined, undefined, 10),
    resource('shell-application-observability', undefined, undefined, 20),
    resource('shell-resources', undefined, undefined, 30),
    resource('shell-alerting', undefined, undefined, 40),
    resource('shell-administration', undefined, undefined, 50),
    resource('monitors', '/monitors', 'shell-basic-monitoring', 10),
    resource('bulletin', '/bulletin', 'shell-basic-monitoring', 20),
    resource('restricted', '/restricted', 'shell-basic-monitoring', 30),
    resource('preview', '/preview', 'shell-basic-monitoring', 40, 'unknown'),
    resource('explore', '/explore', 'shell-application-observability', 10),
    resource('instrumentation', '/observability/integration', 'shell-application-observability', 20),
    resource('entities', '/entities', 'shell-resources', 10),
    resource('topology', '/topology', 'shell-resources', 20),
    resource('alerts', '/alerts', 'shell-alerting', 10),
    hiddenResource('alert-rules', '/alerts/rules', 'alerts'),
    resource('settings', '/settings', 'shell-administration', 10),
    resource('admin-proof', '/admin-proof', 'shell-administration', 20, 'supported', ['ADMIN']),
    hiddenResource('tokens', '/settings/tokens', 'settings', ['ADMIN'])
  ];
}

function hiddenResource(name: string, list: string, parent: string, requiredRoles?: string[]) {
  const value = resource(name, list, parent, 10, 'supported', requiredRoles);
  value.meta.shell.navigation = false;
  return value;
}

function resource(
  name: string,
  list?: string,
  parent?: string,
  order = 0,
  capability: 'supported' | 'unknown' | 'unsupported' = 'supported',
  requiredRoles?: string[]
) {
  return {
    name,
    meta: {
      icon: <span>{name}</span>,
      shell: {
        capability,
        labelKey: labelKey(name),
        navigation: true,
        order,
        timePolicy: list ? ('unknown' as const) : ('none' as const),
        ...(requiredRoles ? { requiredRoles } : {})
      },
      ...(parent ? { parent } : {})
    },
    ...(list ? { list } : {})
  };
}

function labelKey(name: string) {
  if (name === 'alert-rules') return 'alertRules.title';
  if (name === 'shell-basic-monitoring') return 'shell.navigation.basicMonitoring';
  if (name === 'shell-application-observability') return 'shell.navigation.applicationObservability';
  if (name.startsWith('shell-')) return `shell.navigation.${name.slice(6)}`;
  return `menu.${name}`;
}
