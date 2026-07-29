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

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AlertIntegrationGuide, AlertIntegrationState } from '../model/alert-integration-model';

const mocks = vi.hoisted(() => ({ controller: vi.fn() }));
vi.mock('../controller/use-alert-integration-controller', () => ({
  useAlertIntegrationController: mocks.controller
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

import { AlertIntegrationPage } from './alert-integration-page';

describe('AlertIntegrationPage backend guide states', () => {
  afterEach(cleanup);

  it.each(['loading', 'permission', 'unavailable', 'contract', 'error', 'not-found'] as const)(
    'renders %s separately',
    kind => {
      mocks.controller.mockReturnValue(controller(kind));
      render(<AlertIntegrationPage />);
      expect(screen.getByText(`alertIntegrations.states.${kind}`)).toBeInTheDocument();
      const retry = screen.queryByRole('button', { name: 'common.retry' });
      expect(Boolean(retry)).toBe(kind === 'unavailable' || kind === 'error');
    }
  );

  it('renders all backend ready guide evidence and keeps token handoff as navigation', () => {
    mocks.controller.mockReturnValue(controller('ready', readyGuide));
    render(<AlertIntegrationPage />);

    expect(screen.getByText('POST')).toBeInTheDocument();
    expect(screen.getByText('single_alert')).toBeInTheDocument();
    expect(screen.getByText('labels')).toBeInTheDocument();
    expect(screen.getByText('alert.integration.webhook.step.create_token')).toBeInTheDocument();
    expect(screen.getByText('{"status":"firing"}')).toBeInTheDocument();
    expect(screen.getByText('alert.integration.ack.accepted_for_processing')).toBeInTheDocument();
    expect(screen.getByText(`${window.location.origin}/api/alerts/report`)).toBeInTheDocument();
    expect(screen.getByText('Authorization: Bearer {token}')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'alertIntegrations.manageTokens' }));
    expect(actions.openTokenSettings).toHaveBeenCalled();
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
    expect(screen.queryByText(`${window.location.origin}/api/alerts/report`)).not.toBeInTheDocument();
    expect(screen.queryByText('Authorization: Bearer {token}')).not.toBeInTheDocument();
    expect(screen.queryByText('must-not-render')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument();
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
const actions = {
  selectSource: vi.fn(),
  retry: vi.fn(),
  openTokenSettings: vi.fn(),
  copyEndpoint: vi.fn(),
  copyAuthorizationHeader: vi.fn()
};

function controller(kind: AlertIntegrationState['kind'], guide = readyGuide) {
  const state = controllerState(kind, guide);
  return {
    state,
    selectedSource: guide.source,
    contract: kind === 'ready' ? contractFor(guide) : undefined,
    copyState: null,
    tokenSettingsPath: '/settings/tokens',
    actions
  };
}

function contractFor(guide: AlertIntegrationGuide) {
  return {
    endpoint: `${window.location.origin}${guide.ingressPath}`,
    authorizationHeader: `Authorization: ${guide.requiredHeaders.Authorization}`
  };
}

function controllerState(kind: AlertIntegrationState['kind'], guide: AlertIntegrationGuide): AlertIntegrationState {
  if (kind === 'ready') return { kind, catalog: [guide], guide };
  if (kind === 'not-found') return { kind, catalog: [] };
  return { kind };
}
