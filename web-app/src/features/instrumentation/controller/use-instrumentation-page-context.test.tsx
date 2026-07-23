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
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QueryContextProvider } from '@/shared/query-context';
import { buildDetectionRequest, buildGuideRequest } from '../model/instrumentation-requests';

const api = vi.hoisted(() => ({
  loadCatalog: vi.fn(),
  loadCollectors: vi.fn()
}));
vi.mock('../api/instrumentation-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/instrumentation-api')>()),
  loadInstrumentationCatalog: api.loadCatalog
}));
vi.mock('../api/collector-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/collector-api')>()),
  loadInstrumentationCollectors: api.loadCollectors
}));

import { useInstrumentationPageController } from './use-instrumentation-page-controller';

describe('instrumentation page context synchronization', () => {
  afterEach(cleanup);

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
});

function renderContextProbe(additionalContext = '') {
  function Probe() {
    const { setup } = useInstrumentationPageController();
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
  intake: { status: 'unavailable', errorCode: 'intake_not_advertised' }
} as const;
const transientTarget = {
  collectorId: 'main-default-collector',
  otlpHttpEndpoint: 'http://collector.internal:4318',
  otlpGrpcEndpoint: 'http://collector.internal:4317',
  authorizationHeader: 'Authorization' as const
};
