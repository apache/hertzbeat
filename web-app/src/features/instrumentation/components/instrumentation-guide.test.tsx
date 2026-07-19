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
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { InstrumentationSetupController } from '../controller/use-instrumentation-page-controller';

const notifications = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn() }));

vi.mock('antd', async importOriginal => {
  const actual = await importOriginal<typeof import('antd')>();
  return { ...actual, App: { useApp: () => ({ message: notifications }) } };
});
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { InstrumentationGuide } from './instrumentation-guide';

type Guide = NonNullable<InstrumentationSetupController['guide']>;

describe('InstrumentationGuide', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders an unavailable guide and rejects non-official or bundled components', () => {
    const view = render(<InstrumentationGuide setup={setupFixture({ guide: undefined })} onStartDetection={vi.fn()} />);
    expect(screen.getByText('instrumentation.renderUnavailable')).toBeInTheDocument();

    view.rerender(
      <InstrumentationGuide
        setup={setupFixture({ guide: guideFixture({ official: false, bundledWithHertzBeat: true }) })}
        onStartDetection={vi.fn()}
      />
    );
    expect(screen.getByText('instrumentation.componentInvalid')).toBeInTheDocument();
  });

  it('preserves guide step order, snippet details, fallback metadata, and navigation actions', () => {
    const setup = setupFixture({ guide: guideFixture({ version: null }) });
    const onStartDetection = vi.fn();
    render(<InstrumentationGuide setup={setup} onStartDetection={onStartDetection} />);

    const steps = screen.getAllByRole('article');
    expect(steps).toHaveLength(2);
    expect(within(steps[0]!).getByText('01')).toBeInTheDocument();
    expect(within(steps[0]!).getByText('instrumentation.step.configure')).toBeInTheDocument();
    expect(within(steps[0]!).getByText('instrumentation.location.application_environment')).toBeInTheDocument();
    expect(within(steps[1]!).getByText('02')).toBeInTheDocument();
    expect(screen.getByText('OpenTelemetry Go SDK')).toBeInTheDocument();
    expect(screen.getByText('common.unavailable')).toBeInTheDocument();
    expect(screen.getByText('instrumentation.official')).toBeInTheDocument();
    expect(screen.getByText('Apache-2.0')).toBeInTheDocument();
    expect(screen.getByText('bash')).toBeInTheDocument();
    expect(screen.getByText('Authorization=Bearer ${HERTZBEAT_TOKEN}')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'instrumentation.action.reviewContext' }));
    fireEvent.click(screen.getByRole('button', { name: 'instrumentation.action.startDetection' }));
    expect(setup.setStage).toHaveBeenCalledWith(3);
    expect(onStartDetection).toHaveBeenCalledOnce();
  });

  it('blocks a secret copy without a token but permits and reports ordinary copy', async () => {
    const setup = setupFixture({ guide: guideFixture(), token: '' });
    render(<InstrumentationGuide setup={setup} onStartDetection={vi.fn()} />);

    const secretCopy = screen.getByRole('button', { name: /instrumentation\.tokenRequired$/ });
    expect(secretCopy).toBeDisabled();
    fireEvent.click(secretCopy);
    expect(setup.copySnippet).not.toHaveBeenCalled();
    expect(screen.getByText('instrumentation.tokenCopyNotice')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /instrumentation\.action\.copy$/ })[0]!);
    await waitFor(() => expect(setup.copySnippet).toHaveBeenCalledOnce());
    expect(notifications.success).toHaveBeenCalledWith('instrumentation.copySuccess');
  });

  it('copies a token-backed secret without rendering the memory-only token', async () => {
    const setup = setupFixture({ guide: guideFixture(), token: 'memory-only-token' });
    render(<InstrumentationGuide setup={setup} onStartDetection={vi.fn()} />);

    expect(screen.queryByText('memory-only-token')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /instrumentation\.action\.copy$/ })[0]!);
    await waitFor(() => expect(setup.copySnippet).toHaveBeenCalledOnce());
    expect(notifications.success).toHaveBeenCalledWith('instrumentation.copySuccess');
  });

  it('distinguishes a token lost during secret copy from ordinary copy failures', async () => {
    const secretSetup = setupFixture({ guide: guideFixture(), token: 'memory-only-token' });
    secretSetup.copySnippet = vi.fn(() => {
      secretSetup.token = '';
      return Promise.reject(new Error('copy denied'));
    });
    const view = render(<InstrumentationGuide setup={secretSetup} onStartDetection={vi.fn()} />);

    fireEvent.click(screen.getAllByRole('button', { name: /instrumentation\.action\.copy$/ })[0]!);
    await waitFor(() => expect(notifications.warning).toHaveBeenCalledWith('instrumentation.tokenRequired'));

    notifications.warning.mockClear();
    const ordinarySetup = setupFixture({ guide: guideFixture(), token: '' });
    ordinarySetup.copySnippet = vi.fn().mockRejectedValue(new Error('copy denied'));
    view.rerender(<InstrumentationGuide setup={ordinarySetup} onStartDetection={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('button', { name: /instrumentation\.action\.copy$/ })[0]!);
    await waitFor(() => expect(notifications.warning).toHaveBeenCalledWith('instrumentation.copyFailed'));
  });
});

function setupFixture(overrides: Partial<InstrumentationSetupController> = {}): InstrumentationSetupController {
  return {
    schemaVersion: 1,
    stage: 4,
    setStage: vi.fn(),
    draft: {
      environment: 'docker',
      platform: 'linux_amd64',
      selection: {
        language: 'go',
        framework: 'go_generic',
        method: 'sdk',
        environment: 'docker',
        platform: 'linux_amd64'
      },
      collectorId: 'collector-east',
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      serviceEnvironment: 'prod'
    },
    selectionOptions: {
      environments: [],
      platforms: [],
      languages: [],
      frameworks: [],
      methods: [],
      frameworkSelected: false
    },
    contextMissing: [],
    catalog: undefined,
    catalogPending: false,
    catalogError: false,
    retryCatalog: vi.fn(),
    collectors: [],
    collectorsPending: false,
    collectorsError: false,
    retryCollectors: vi.fn(),
    token: '',
    setToken: vi.fn(),
    transientTarget: undefined,
    setTransientTarget: vi.fn(),
    guide: guideFixture(),
    guideState: { status: 'ready', guide: guideFixture() },
    guidePending: false,
    guideError: false,
    setEnvironment: vi.fn(),
    setPlatform: vi.fn(),
    setLanguage: vi.fn(),
    setFramework: vi.fn(),
    setMethod: vi.fn(),
    setContext: vi.fn(),
    renderGuide: vi.fn(),
    copySnippet: vi.fn().mockResolvedValue(undefined),
    clearGuide: vi.fn(),
    handleContractError: vi.fn(),
    ...overrides
  };
}

function guideFixture(componentOverrides: Partial<Guide['component']> = {}): Guide {
  return {
    schemaVersion: 1,
    selection: {
      language: 'go',
      framework: 'go_generic',
      method: 'sdk',
      environment: 'docker',
      platform: 'linux_amd64'
    },
    signals: { metrics: 'supported', logs: 'preview', traces: 'supported' },
    component: {
      name: 'OpenTelemetry Go SDK',
      sourceUrl: 'https://opentelemetry.io/',
      version: '1.43.0',
      versionPolicy: 'pinned',
      license: 'Apache-2.0',
      installationLocationKey: 'instrumentation.location.application_host',
      official: true,
      bundledWithHertzBeat: false,
      dependencies: [],
      artifacts: [],
      ...componentOverrides
    },
    secretPlaceholders: {
      authorizationToken: { marker: '${HERTZBEAT_TOKEN}', valueFormat: 'url_unreserved', replacement: 'raw' }
    },
    steps: [
      {
        id: 'configure',
        type: 'configure',
        titleKey: 'instrumentation.step.configure',
        executionLocationKey: 'instrumentation.location.application_environment',
        snippets: [
          {
            id: 'otel-env',
            language: 'bash',
            content: 'Authorization=Bearer ${HERTZBEAT_TOKEN}',
            secretPlaceholders: ['authorizationToken']
          },
          { id: 'otel-config', language: 'yaml', content: 'exporter: otlp', secretPlaceholders: [] }
        ]
      },
      {
        id: 'start',
        type: 'start',
        titleKey: 'instrumentation.step.start',
        executionLocationKey: 'instrumentation.location.application_host',
        snippets: [{ id: 'start-app', language: 'shell', content: './start', secretPlaceholders: [] }]
      }
    ]
  };
}
