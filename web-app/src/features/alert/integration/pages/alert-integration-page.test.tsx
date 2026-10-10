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

// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AlertIntegrationGuide, AlertIntegrationState } from '../model/alert-integration-model';

const mocks = vi.hoisted(() => ({ controller: vi.fn() }));
vi.mock('../controller/use-alert-integration-controller', () => ({
  useAlertIntegrationController: mocks.controller
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { time?: string }) => (options?.time ? `${key}:${options.time}` : key),
    i18n: { language: 'pt-BR', resolvedLanguage: 'pt-BR' }
  })
}));

import { AlertIntegrationPage } from './alert-integration-page';

describe('AlertIntegrationPage backend guide states', () => {
  afterEach(cleanup);

  it.each([
    ['loading', 'loading', 'status'],
    ['permission', 'permission', 'status'],
    ['unavailable', 'unavailable', 'alert'],
    ['contract', 'error', 'alert'],
    ['error', 'error', 'alert'],
    ['not-found', 'empty', 'status']
  ] as const)('renders %s in the shared operational frame', (kind, panelKind, panelRole) => {
    mocks.controller.mockReturnValue(controller(kind));
    render(<AlertIntegrationPage />);
    expect(document.querySelector('[data-hb-operational-page]')).toHaveAttribute('data-mode', 'data');
    expect(screen.getByRole('heading', { level: 2, name: 'alertIntegrations.menu' })).toBeVisible();
    expect(document.querySelector('[data-hb-operational-result-region]')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByRole(panelRole, { name: `alertIntegrations.states.${kind}` })).toHaveAttribute(
      'data-state',
      panelKind
    );
    const retry = screen.queryByRole('button', { name: 'common.retry' });
    expect(Boolean(retry)).toBe(kind === 'unavailable' || kind === 'error');
  });

  it('renders all backend ready guide evidence and keeps token handoff as navigation', () => {
    mocks.controller.mockReturnValue(controller('ready', readyGuide));
    render(<AlertIntegrationPage />);

    expect(document.querySelector('[data-hb-operational-page-header]')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'alertIntegrations.sourcesLabel' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: readyGuide.displayNameKey })).toBeVisible();
    expect(screen.getByText('alertIntegrations.description')).toBeVisible();
    expect(screen.queryByText('alertIntegrations.readiness.ready')).not.toBeInTheDocument();
    expect(screen.getByText('POST')).toBeInTheDocument();
    expect(screen.getByText('single_alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'alertIntegrations.requestHeaders' })).toBeVisible();
    expect(screen.getByText(/Content-Type: application\/json Authorization: Bearer \{token\}/)).toBeInTheDocument();
    expect(screen.getByText('labels')).toBeInTheDocument();
    expect(screen.getByText('alert.integration.webhook.step.create_token')).toBeInTheDocument();
    expect(screen.getByText('{"status":"firing"}')).toBeInTheDocument();
    expect(screen.getByText('alert.integration.ack.accepted_for_processing')).toBeInTheDocument();
    expect(screen.getByText('/api/alerts/report')).toBeInTheDocument();
    expect(screen.getByText('alertIntegrations.endpointRelativeHint')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'alertIntegrations.copy' }).length).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole('link', { name: 'alertIntegrations.generateToken' }));
    expect(actions.openTokenSettings).toHaveBeenCalled();
  });

  it('groups the source rail by backend readiness and preserves every source', () => {
    mocks.controller.mockReturnValue({
      ...controller('ready', readyGuide),
      state: {
        kind: 'ready',
        guide: readyGuide,
        catalog: [
          { ...readyGuide, verification: unverified },
          {
            ...readyGuide,
            source: 'zabbix',
            displayNameKey: 'alert.integration.source.zabbix',
            verification: unverified
          },
          {
            ...readyGuide,
            source: 'skywalking',
            displayNameKey: 'alert.integration.source.skywalking',
            iconKey: 'skywalking',
            readiness: 'configuration_required',
            verification: unverified
          },
          {
            ...readyGuide,
            source: 'blocked-source',
            displayNameKey: 'alert.integration.source.blocked',
            readiness: 'guide_blocked',
            verification: unverified
          }
        ]
      }
    });
    render(<AlertIntegrationPage />);

    expect(screen.getByText('alertIntegrations.sourceGroups.ready')).toBeVisible();
    expect(screen.getByText('alertIntegrations.sourceGroups.configuration_required')).toBeVisible();
    expect(screen.getByText('alertIntegrations.sourceGroups.guide_blocked')).toBeVisible();
    expect(screen.getByRole('button', { name: 'alert.integration.source.zabbix' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'alert.integration.source.skywalking' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'alert.integration.source.blocked' })).toBeVisible();
  });

  it('shows a rail dot only for a source verified by real accepted traffic', () => {
    const verified = {
      ...readyGuide,
      source: 'volcengine',
      displayNameKey: 'alert.integration.source.volcengine',
      iconKey: 'volcengine' as const,
      verification: { status: 'verified' as const, startedAt: 100, verifiedAt: 200 }
    };
    mocks.controller.mockReturnValue({
      ...controller('ready', readyGuide),
      state: {
        kind: 'ready',
        guide: readyGuide,
        catalog: [{ ...readyGuide, verification: unverified }, verified]
      }
    });

    render(<AlertIntegrationPage />);

    expect(screen.getAllByTitle('alertIntegrations.verification.verifiedRail')).toHaveLength(1);
  });

  it('starts a real-event verification from the final setup step', () => {
    mocks.controller.mockReturnValue(controller('ready', readyGuide));
    render(<AlertIntegrationPage />);

    fireEvent.click(screen.getByRole('button', { name: 'alertIntegrations.verification.start' }));

    expect(actions.startVerification).toHaveBeenCalled();
  });

  it('formats verification evidence with the active application locale', () => {
    const verifiedAt = Date.UTC(2026, 7, 23, 14, 42, 23);
    mocks.controller.mockReturnValue({
      ...controller('ready', readyGuide),
      state: {
        kind: 'ready',
        guide: readyGuide,
        catalog: [
          {
            ...readyGuide,
            verification: { status: 'verified', startedAt: verifiedAt - 1_000, verifiedAt }
          }
        ]
      }
    });

    render(<AlertIntegrationPage />);

    const expected = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'medium' }).format(verifiedAt);
    expect(screen.getByText(`alertIntegrations.verification.verifiedHint:${expected}`)).toBeVisible();
  });

  it('renders Zabbix media parameters and script as distinct copyable setup evidence', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const zabbixGuide: AlertIntegrationGuide = {
      ...readyGuide,
      source: 'zabbix',
      displayNameKey: 'alert.integration.source.zabbix',
      iconKey: 'zabbix',
      snippets: ['{"URL":"https://hertzbeat.example/api/alerts/report/zabbix"}', 'return request.getStatus();']
    };
    mocks.controller.mockReturnValue(controller('ready', zabbixGuide));
    render(<AlertIntegrationPage />);

    expect(screen.getByRole('heading', { name: 'alertIntegrations.zabbix.parameters' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'alertIntegrations.zabbix.script' })).toBeVisible();
    const copyButtons = screen.getAllByRole('button', { name: 'alertIntegrations.copy' });
    fireEvent.click(copyButtons.at(-1)!);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('return request.getStatus();'));
  });

  it('reports clipboard failures instead of silently ignoring a broken copy action', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard unavailable'));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    mocks.controller.mockReturnValue(controller('ready', readyGuide));
    render(<AlertIntegrationPage />);

    fireEvent.click(screen.getAllByRole('button', { name: 'alertIntegrations.copy' })[0]!);
    expect(await screen.findByRole('status')).toHaveTextContent('alertIntegrations.copyFailed');
  });

  it('does not expose token management to a read-only session', () => {
    mocks.controller.mockReturnValue({ ...controller('ready', readyGuide), canManageTokens: false });
    render(<AlertIntegrationPage />);

    expect(screen.queryByRole('link', { name: 'alertIntegrations.generateToken' })).not.toBeInTheDocument();
  });

  it('makes configuration-required explicit without inventing readiness', () => {
    mocks.controller.mockReturnValue(controller('ready', { ...readyGuide, readiness: 'configuration_required' }));
    render(<AlertIntegrationPage />);
    expect(screen.getByText('alertIntegrations.readiness.configuration_required')).toBeInTheDocument();
  });

  it('blocks every runnable contract for guide-blocked sources while retaining honest limitations', () => {
    mocks.controller.mockReturnValue(
      controller('ready', {
        ...readyGuide,
        readiness: 'guide_blocked',
        snippets: ['must-not-render'],
        limitations: ['alert.integration.limit.zabbix.authorization_missing']
      })
    );
    render(<AlertIntegrationPage />);

    expect(screen.getByText('alertIntegrations.readiness.guide_blocked')).toBeInTheDocument();
    expect(screen.getByText('alert.integration.limit.zabbix.authorization_missing')).toBeInTheDocument();
    expect(screen.queryByText('/api/alerts/report')).not.toBeInTheDocument();
    expect(screen.queryByText('Authorization: Bearer {token}')).not.toBeInTheDocument();
    expect(screen.queryByText('must-not-render')).not.toBeInTheDocument();
    expect(screen.queryByText('alert.integration.ack.accepted_for_processing')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'alertIntegrations.generateToken' })).not.toBeInTheDocument();
  });
});

const readyGuide: AlertIntegrationGuide = {
  source: 'webhook',
  displayNameKey: 'alert.integration.source.webhook',
  iconKey: 'hertzbeat',
  method: 'POST',
  ingressPath: '/api/alerts/report',
  payloadShape: 'single_alert',
  requiredHeaders: { Authorization: 'Bearer {token}' },
  requiredFields: ['labels'],
  steps: ['alert.integration.webhook.step.create_token'],
  snippets: ['{"status":"firing"}'],
  acknowledgement: 'alert.integration.ack.accepted_for_processing',
  readiness: 'ready',
  limitations: []
};
const unverified = { status: 'unverified' as const, startedAt: null, verifiedAt: null };
const actions = {
  selectSource: vi.fn(),
  retry: vi.fn(),
  startVerification: vi.fn(),
  openTokenSettings: vi.fn()
};

function controller(kind: AlertIntegrationState['kind'], guide: AlertIntegrationGuide = readyGuide) {
  const state = controllerState(kind, guide);
  return {
    state,
    selectedSource: guide.source,
    contract: kind === 'ready' ? contractFor(guide) : undefined,
    tokenSettingsPath: '/settings/tokens?scope=api-admin&returnTo=%2Falerts%2Fintegrations%2Fwebhook',
    canManageTokens: true,
    verificationStarting: false,
    verificationError: false,
    actions
  };
}

function contractFor(guide: AlertIntegrationGuide) {
  const [headerName, headerValue] = Object.entries(guide.requiredHeaders)[0]!;
  return {
    endpoint: guide.ingressPath,
    ingressPath: guide.ingressPath,
    publicBaseUrlConfigured: false,
    requestHeaders: `Content-Type: application/json\n${headerName}: ${headerValue}`
  };
}

function controllerState(kind: AlertIntegrationState['kind'], guide: AlertIntegrationGuide): AlertIntegrationState {
  if (kind === 'ready') {
    return {
      kind,
      catalog: [
        {
          source: guide.source,
          displayNameKey: guide.displayNameKey,
          iconKey: guide.iconKey,
          readiness: guide.readiness,
          limitations: guide.limitations,
          verification: { status: 'unverified', startedAt: null, verifiedAt: null }
        }
      ],
      guide
    };
  }
  if (kind === 'not-found') return { kind, catalog: [] };
  return { kind };
}
