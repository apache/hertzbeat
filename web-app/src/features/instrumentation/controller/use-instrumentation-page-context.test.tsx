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
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QueryContextProvider } from '@/shared/query-context';
import { buildDetectionRequest, buildGuideRequest } from '../model/instrumentation-requests';

const api = vi.hoisted(() => ({
  loadCatalog: vi.fn(),
  loadCollectors: vi.fn(),
  renderGuide: vi.fn()
}));
vi.mock('../api/instrumentation-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/instrumentation-api')>()),
  loadInstrumentationCatalog: api.loadCatalog,
  renderInstrumentationGuide: api.renderGuide
}));
vi.mock('../api/collector-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/collector-api')>()),
  loadInstrumentationCollectors: api.loadCollectors
}));

import { useInstrumentationPageController } from './use-instrumentation-page-controller';

describe('instrumentation page context synchronization', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('keeps a controlled service name through query-context persistence and restore', async () => {
    api.loadCatalog.mockResolvedValue(catalog);
    api.loadCollectors.mockResolvedValue([collector]);
    const router = renderContextProbe();
    await waitFor(() => expect(screen.getByTestId('catalog-state')).toHaveTextContent('ready'));

    fireEvent.change(screen.getByLabelText('service-name'), { target: { value: 'checkout-api' } });

    await waitFor(() => expect(screen.getByLabelText('service-name')).toHaveValue('checkout-api'));
    await waitFor(() => expect(router.state.location.search).toContain('serviceName=checkout-api'));

    fireEvent.change(screen.getByLabelText('service-namespace'), { target: { value: 'commerce' } });
    await waitFor(() => expect(screen.getByLabelText('service-namespace')).toHaveValue('commerce'));
    await waitFor(() => expect(router.state.location.search).toContain('serviceNamespace=commerce'));

    fireEvent.change(screen.getByLabelText('service-environment'), { target: { value: 'review' } });
    await waitFor(() => expect(screen.getByLabelText('service-environment')).toHaveValue('review'));
    await waitFor(() =>
      expect(router.state.location.search).toContain(
        'collectorId=main-default-collector&serviceName=checkout-api&serviceNamespace=commerce&environment=review'
      )
    );
    expect(router.state.location.search).not.toMatch(/token|secret/i);
  });

  it('restores optional routed identity into requests and clears it after an upstream service change', async () => {
    api.loadCatalog.mockResolvedValue(catalog);
    api.loadCollectors.mockResolvedValue([collector]);
    const router = renderContextProbe(
      '&serviceName=checkout-api&serviceNamespace=commerce&instance=checkout-7d9&endpoint=%2Fcheckout'
    );
    await waitFor(() => expect(screen.getByTestId('catalog-state')).toHaveTextContent('ready'));
    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId('request-context').textContent ?? '{}')).toMatchObject({
        render: {
          service: {
            name: 'checkout-api',
            namespace: 'commerce',
            environment: 'review',
            serviceInstanceId: 'checkout-7d9',
            endpoint: '/checkout'
          }
        },
        detect: {
          service: {
            name: 'checkout-api',
            namespace: 'commerce',
            environment: 'review',
            serviceInstanceId: 'checkout-7d9',
            endpoint: '/checkout'
          }
        }
      })
    );

    fireEvent.change(screen.getByLabelText('service-name'), { target: { value: 'payments-api' } });

    await waitFor(() => expect(router.state.location.search).not.toMatch(/instance=|endpoint=/));
    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId('draft-context').textContent ?? '{}')).toEqual({
        name: 'payments-api',
        namespace: '',
        environment: ''
      })
    );
    expect(screen.getByTestId('request-context')).toBeEmptyDOMElement();
  });

  it('keeps a resolved guide and advances the routed flow after rendering', async () => {
    api.loadCatalog.mockResolvedValue(catalog);
    api.loadCollectors.mockResolvedValue([collector]);
    api.renderGuide.mockResolvedValue(guide);
    const router = renderContextProbe('&serviceName=checkout-api&serviceNamespace=commerce');
    const routedStages: unknown[] = [];
    const unsubscribe = router.subscribe(state => routedStages.push(state.location.state));
    await waitFor(() => expect(screen.getByTestId('catalog-state')).toHaveTextContent('ready'));

    fireEvent.change(screen.getByLabelText('api-token'), { target: { value: 'memory-only-token' } });
    await waitFor(() => expect(screen.getByLabelText('api-token')).toHaveValue('memory-only-token'));
    expect(router.state.location.search).not.toMatch(/token|secret/i);

    fireEvent.click(screen.getByRole('button', { name: 'render-guide' }));

    await waitFor(() => expect(api.renderGuide).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByTestId('render-outcome')).toHaveTextContent('resolved'));
    expect(api.renderGuide.mock.calls[0]?.[0]).toMatchObject({
      service: { name: 'checkout-api', namespace: 'commerce', environment: 'review' },
      collector: { collectorId: 'main-default-collector' }
    });
    expect(JSON.stringify(api.renderGuide.mock.calls[0]?.[0])).not.toContain('memory-only-token');
    unsubscribe();
    expect(routedStages.length).toBeGreaterThan(0);
    expect(routedStages.every(state => JSON.stringify(state) === '{"instrumentationStage":4}')).toBe(true);
    expect(router.state.location.state).toEqual({ instrumentationStage: 4 });
    expect(screen.getByTestId('flow-stage')).toHaveTextContent('4');
    expect(screen.getByTestId('guide-state')).toHaveTextContent('ready');
    expect(screen.getByTestId('guide-id')).toHaveTextContent('configure');
    expect(router.state.location.search).not.toMatch(/token|secret/i);
  });
});

function renderContextProbe(additionalContext = '') {
  function Probe() {
    const { setup } = useInstrumentationPageController();
    const [renderOutcome, setRenderOutcome] = useState('idle');
    const requests =
      setup.contextMissing.length === 0
        ? {
            render: buildGuideRequest(setup.draft, collector, transientTarget),
            detect: buildDetectionRequest(setup.draft, 1_710_000_000_000)
          }
        : undefined;
    return (
      <>
        <output data-testid="catalog-state">{setup.catalogPending ? 'loading' : 'ready'}</output>
        <output data-testid="flow-stage">{setup.stage}</output>
        <output data-testid="guide-state">{setup.guideState.status}</output>
        <output data-testid="guide-id">{setup.guide?.steps[0]?.id ?? ''}</output>
        <output data-testid="render-outcome">{renderOutcome}</output>
        <output data-testid="draft-context">{JSON.stringify(serviceContext(setup.draft))}</output>
        <output data-testid="request-context">{requests ? JSON.stringify(requests) : ''}</output>
        <input
          aria-label="service-name"
          value={setup.draft.serviceName}
          onChange={event => setup.setContext('serviceName', event.target.value)}
        />
        <input
          aria-label="service-namespace"
          value={setup.draft.serviceNamespace}
          onChange={event => setup.setContext('serviceNamespace', event.target.value)}
        />
        <input
          aria-label="service-environment"
          value={setup.draft.serviceEnvironment}
          onChange={event => setup.setContext('serviceEnvironment', event.target.value)}
        />
        <input aria-label="api-token" value={setup.token} onChange={event => setup.setToken(event.target.value)} />
        <button
          type="button"
          onClick={() => {
            void setup.renderGuide().then(
              () => setRenderOutcome('resolved'),
              () => setRenderOutcome('rejected')
            );
          }}
        >
          render-guide
        </button>
      </>
    );
  }
  const router = createMemoryRouter(
    [
      {
        path: '/observability/integration',
        element: (
          <QueryContextProvider>
            <Probe />
          </QueryContextProvider>
        )
      }
    ],
    {
      initialEntries: [
        '/observability/integration?instrumentationSchemaVersion=1&instrumentationStage=3' +
          '&instrumentationEnvironment=docker&instrumentationPlatform=linux_amd64' +
          '&instrumentationLanguage=go&instrumentationFramework=go_generic&instrumentationMethod=sdk' +
          `&collectorId=main-default-collector&environment=review${additionalContext}`
      ]
    }
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return router;
}

function serviceContext(draft: ReturnType<typeof useInstrumentationPageController>['setup']['draft']) {
  const { serviceName: name, serviceNamespace: namespace, serviceEnvironment: environment } = draft;
  return { name, namespace, environment, ...optionalServiceContext(draft) };
}

function optionalServiceContext(draft: ReturnType<typeof useInstrumentationPageController>['setup']['draft']) {
  return {
    ...(draft.serviceInstanceId ? { serviceInstanceId: draft.serviceInstanceId } : {}),
    ...(draft.endpoint ? { endpoint: draft.endpoint } : {})
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
  collectorId: 'main-default-collector',
  name: 'main-default-collector',
  online: true,
  address: '127.0.0.1',
  intake: {
    status: 'available',
    schemaVersion: 1,
    collectorId: 'main-default-collector',
    gateway: 'collector',
    capabilities: ['otlp_http_protobuf', 'otlp_grpc'],
    otlpHttpEndpoint: 'https://collector.internal:4318',
    otlpGrpcEndpoint: 'https://collector.internal:4317',
    authorizationHeader: 'Authorization'
  }
} as const;
const transientTarget = {
  collectorId: 'main-default-collector',
  otlpHttpEndpoint: 'http://collector.internal:4318',
  otlpGrpcEndpoint: 'http://collector.internal:4317',
  authorizationHeader: 'Authorization' as const
};
const guide = {
  schemaVersion: 1,
  selection: {
    language: 'go',
    framework: 'go_generic',
    method: 'sdk',
    environment: 'docker',
    platform: 'linux_amd64'
  },
  signals: { metrics: 'supported', logs: 'preview', traces: 'supported' },
  component,
  secretPlaceholders: {},
  steps: [
    {
      id: 'configure',
      type: 'configure',
      titleKey: 'instrumentation.step.configure',
      executionLocationKey: 'instrumentation.location.application_environment',
      snippets: []
    }
  ]
};
