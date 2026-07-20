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

import { App } from 'antd';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

const { useInstrumentationPageController, useInstrumentationSetup, useInstrumentationDetection } = vi.hoisted(() => ({
  useInstrumentationPageController: vi.fn(),
  useInstrumentationSetup: vi.fn(),
  useInstrumentationDetection: vi.fn()
}));
vi.mock('../controller/use-instrumentation-page-controller', () => ({ useInstrumentationPageController }));

import { InstrumentationPage } from './instrumentation-page';

describe('InstrumentationPage', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeAll(() => {
    useInstrumentationPageController.mockImplementation(() => ({
      setup: useInstrumentationSetup(),
      detection: useInstrumentationDetection()
    }));
  });

  it('renders the continuous runbook and does not turn unavailable data into a zero or success state', () => {
    useInstrumentationSetup.mockReturnValue(setupFixture());
    useInstrumentationDetection.mockReturnValue({
      ...detectionFixture(),
      state: { status: 'error', error: new Error('storage unavailable') }
    });
    renderPage();

    expect(screen.getByRole('heading', { name: 'Instrument an application' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('Signal detection is unavailable.')).toBeInTheDocument();
    expect(screen.queryByText(/^0$/)).not.toBeInTheDocument();
  });

  it('renders the schema version supplied by the validated catalog boundary', () => {
    useInstrumentationSetup.mockReturnValue({ ...setupFixture(), schemaVersion: 7 });
    useInstrumentationDetection.mockReturnValue(detectionFixture());
    renderPage();

    expect(screen.getByText(i18n.t('instrumentation.schemaVersion', { version: 7 }))).toBeInTheDocument();
    expect(screen.queryByText(i18n.t('instrumentation.schemaVersion', { version: 1 }))).not.toBeInTheDocument();
  });

  it('allows returning to completed stages, resets detection evidence, and locks future stages', () => {
    const setup = { ...setupFixture(), stage: 3, catalog };
    const detection = detectionFixture();
    useInstrumentationSetup.mockReturnValue(setup);
    useInstrumentationDetection.mockReturnValue(detection);
    renderPage();

    const environment = screen.getByRole('button', { name: /Environment$/ });
    const language = screen.getByRole('button', { name: /Language and method$/ });
    const installation = screen.getByRole('button', { name: /Install and configure$/ });
    const detectionStage = screen.getByRole('button', { name: /Verify signals$/ });
    expect(environment).toBeEnabled();
    expect(language).toBeEnabled();
    expect(installation).toBeDisabled();
    expect(detectionStage).toBeDisabled();

    fireEvent.click(language);
    expect(detection.reset).toHaveBeenCalledOnce();
    expect(setup.setStage).toHaveBeenCalledWith(2);
  });

  it('keeps catalog failure and Collector empty or offline states actionable and distinct', () => {
    const retryCatalog = vi.fn();
    useInstrumentationSetup.mockReturnValue({ ...setupFixture(), stage: 1, catalogError: true, retryCatalog });
    useInstrumentationDetection.mockReturnValue(detectionFixture());
    const view = renderPage();

    expect(screen.getByText('The instrumentation catalog is unavailable.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retryCatalog).toHaveBeenCalledOnce();

    useInstrumentationSetup.mockReturnValue({ ...setupFixture(), stage: 3, catalog, collectors: [] });
    view.rerender(pageElement());
    expect(screen.getByText('No registered Collectors are available.')).toBeInTheDocument();
    expect(screen.queryByText('Installation guidance is unavailable for this selection.')).not.toBeInTheDocument();

    useInstrumentationSetup.mockReturnValue({
      ...setupFixture(),
      stage: 3,
      catalog,
      collectors: [{ ...collector, online: false }],
      guideState: { status: 'unavailable', reason: 'collector_unavailable' }
    });
    view.rerender(pageElement());
    expect(screen.getByText('The selected Collector is offline.')).toBeInTheDocument();
    expect(screen.queryByText('Installation guidance is unavailable for this selection.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Render instructions' })).toBeDisabled();
  });

  it('blocks guide rendering when the selected online Collector has no advertised intake', () => {
    const renderGuide = vi.fn();
    useInstrumentationSetup.mockReturnValue({
      ...setupFixture(),
      stage: 3,
      catalog,
      collectors: [collector],
      renderGuide,
      guideState: { status: 'unavailable', reason: 'collector_intake_unavailable' }
    });
    useInstrumentationDetection.mockReturnValue(detectionFixture());
    renderPage();

    expect(screen.getByText('Installation guidance is unavailable for this selection.')).toBeInTheDocument();
    const renderAction = screen.getByRole('button', { name: 'Render instructions' });
    expect(renderAction).toBeDisabled();
    fireEvent.click(renderAction);
    expect(renderGuide).not.toHaveBeenCalled();
    expect(screen.queryByText(/4317|4318/)).not.toBeInTheDocument();
  });

  it('keeps a secret snippet copy action disabled until the memory-only Token is present', () => {
    useInstrumentationSetup.mockReturnValue({ ...setupFixture(), stage: 4, catalog, guide });
    useInstrumentationDetection.mockReturnValue(detectionFixture());
    renderPage();

    expect(screen.getByRole('button', { name: /Token required/ })).toBeDisabled();
    expect(
      screen.getByText('Add a token before copying a snippet that contains the authorization placeholder.')
    ).toBeInTheDocument();
  });

  it('enables Explore only for received signals and renders waiting and unsupported honestly', () => {
    const openQuery = vi.fn();
    const response = detectionResponse({
      metrics: ['received', null],
      logs: ['waiting', 'signal_not_received'],
      traces: ['unsupported', 'signal_not_supported']
    });
    response.queryJumps.push({ ...response.queryJumps[0]!, signal: 'logs', enabled: true });
    useInstrumentationSetup.mockReturnValue({ ...setupFixture(), catalog });
    useInstrumentationDetection.mockReturnValue({
      ...detectionFixture(response),
      openQuery,
      queryHandoff: vi.fn((signal: string) => (signal === 'metrics' ? '/explore?ownedBy=controller' : undefined))
    });
    renderPage();

    const explore = screen.getByRole('button', { name: /Open in Explore/ });
    expect(explore).not.toHaveAttribute('href');
    fireEvent.click(explore);
    expect(openQuery).toHaveBeenCalledWith('metrics');
    expect(screen.getByText('Waiting')).toBeInTheDocument();
    expect(screen.getByText('Unsupported')).toBeInTheDocument();
    expect(screen.getAllByText('Query unavailable')).toHaveLength(2);
  });

  it('distinguishes storage unavailable and detection error signal results', () => {
    useInstrumentationSetup.mockReturnValue({ ...setupFixture(), catalog });
    useInstrumentationDetection.mockReturnValue(
      detectionFixture(
        detectionResponse({
          metrics: ['unavailable', 'storage_unavailable'],
          logs: ['error', 'storage_query_failed'],
          traces: ['waiting', 'signal_not_received']
        })
      )
    );
    renderPage();

    expect(screen.getByText('Storage unavailable')).toBeInTheDocument();
    expect(screen.getByText('Detection error')).toBeInTheDocument();
    expect(screen.getByText('Telemetry storage is unavailable.')).toBeInTheDocument();
    expect(screen.getByText('Telemetry storage could not be queried.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Open in Explore/ })).not.toBeInTheDocument();
  });

  it.each([
    ['waiting', 'signal_not_received'],
    ['received', null],
    ['unsupported', 'signal_not_supported'],
    ['unavailable', 'storage_unavailable'],
    ['error', 'storage_query_failed']
  ] as const)('renders %s as explicit signal evidence without a fake zero', (status, errorCode) => {
    useInstrumentationSetup.mockReturnValue({ ...setupFixture(), catalog });
    useInstrumentationDetection.mockReturnValue(
      detectionFixture(
        detectionResponse({
          metrics: [status, errorCode],
          logs: ['unsupported', 'signal_not_supported'],
          traces: ['unsupported', 'signal_not_supported']
        })
      )
    );
    renderPage();

    expect(
      screen.getAllByText(i18n.t(`instrumentation.detection.status.${status}`), { selector: '.ant-tag' }).length
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/^0$/)).not.toBeInTheDocument();
  });

  it('renders only the state exposed by the page controller boundary', () => {
    useInstrumentationSetup.mockReturnValue(setupFixture());
    useInstrumentationDetection.mockReturnValue(detectionFixture());

    renderPage();

    expect(useInstrumentationPageController).toHaveBeenCalledOnce();
  });
});

function renderPage() {
  return render(pageElement());
}

function pageElement() {
  return (
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <App>
          <InstrumentationPage />
        </App>
      </MemoryRouter>
    </I18nextProvider>
  );
}

function setupFixture() {
  return {
    schemaVersion: 1,
    stage: 5,
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
      environments: ['docker'],
      platforms: ['linux_amd64'],
      languages: catalog.languages,
      frameworks: catalog.languages[0]!.frameworks,
      methods: catalog.languages[0]!.frameworks[0]!.methods,
      frameworkSelected: true
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
    guide: undefined,
    guidePending: false,
    guideError: false,
    guideState: { status: 'unavailable', reason: 'collector_unavailable' },
    setEnvironment: vi.fn(),
    setPlatform: vi.fn(),
    setLanguage: vi.fn(),
    setFramework: vi.fn(),
    setMethod: vi.fn(),
    setContext: vi.fn(),
    renderGuide: vi.fn(),
    copySnippet: vi.fn(),
    clearGuide: vi.fn(),
    handleContractError: vi.fn()
  };
}

function detectionFixture(response?: ReturnType<typeof detectionResponse>) {
  return {
    state: response ? { status: 'complete', response } : { status: 'idle' },
    start: vi.fn(),
    retry: vi.fn(),
    reset: vi.fn(),
    signalNames: ['metrics', 'logs', 'traces'],
    queryHandoff: vi.fn(),
    openQuery: vi.fn()
  };
}

function detectionResponse(statuses: Record<'metrics' | 'logs' | 'traces', [string, string | null]>) {
  const context = {
    serviceName: 'checkout-api',
    serviceNamespace: 'commerce',
    environment: 'prod',
    collectorId: 'collector-east',
    startedAt: 1_710_000_000_000,
    detectedAt: 1_710_000_005_000
  };
  return {
    schemaVersion: 1,
    detectedAt: context.detectedAt,
    context: {
      schemaVersion: 1,
      language: 'go',
      framework: 'go_generic',
      method: 'sdk',
      environment: 'docker',
      platform: 'linux_amd64',
      service: {
        serviceName: context.serviceName,
        serviceNamespace: context.serviceNamespace,
        environment: context.environment
      },
      collectorId: context.collectorId,
      startedAt: context.startedAt
    },
    signals: Object.fromEntries(
      Object.entries(statuses).map(([signal, [status, errorCode]]) => [
        signal,
        {
          status,
          lastReceivedAt: status === 'received' ? context.detectedAt : null,
          errorCode
        }
      ])
    ),
    polling: { decision: 'complete', pollAfterMs: null, deadlineAt: context.startedAt + 120_000 },
    queryJumpContext: context,
    queryJumps: statuses.metrics[0] === 'received' ? [{ signal: 'metrics', enabled: true, context }] : []
  };
}

const component = {
  name: 'OpenTelemetry Go SDK',
  sourceUrl: 'https://opentelemetry.io/',
  version: '1.43.0',
  versionPolicy: 'pinned',
  license: 'Apache-2.0',
  installationLocationKey: 'instrumentation.location.application_host',
  official: true,
  bundledWithHertzBeat: false,
  dependencies: [],
  artifacts: []
};

const catalog = {
  schemaVersion: 1,
  languages: [
    {
      language: 'go',
      labelKey: 'instrumentation.language.go',
      frameworks: [
        {
          framework: 'go_generic',
          labelKey: 'instrumentation.framework.go_generic',
          methods: [
            {
              method: 'sdk',
              labelKey: 'instrumentation.method.sdk',
              preview: false,
              environments: ['docker'],
              platforms: ['linux_amd64'],
              signals: { metrics: 'supported', logs: 'preview', traces: 'supported' },
              component
            }
          ]
        }
      ]
    }
  ]
};

const collector = {
  collectorId: 'collector-east',
  name: 'collector-east',
  online: true,
  address: '10.0.0.8',
  intake: { status: 'unavailable', errorCode: 'old_server' }
};

const guide = {
  schemaVersion: 1,
  selection: { language: 'go', framework: 'go_generic', method: 'sdk', environment: 'docker', platform: 'linux_amd64' },
  signals: { metrics: 'supported', logs: 'preview', traces: 'supported' },
  component,
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
        }
      ]
    }
  ]
};
