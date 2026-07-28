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
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

const { apiMessageGet } = vi.hoisted(() => ({ apiMessageGet: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  apiMessageGet
}));

import { ApiMessageError } from '@/core/http/api-message';

import { createPublicStatusIncidentRange } from '../model/public-status-incident-range';
import { PublicStatusPage } from './public-status-page';

describe('PublicStatusPage failure states', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows unconfigured only for the exact backend organization response', async () => {
    mockStatusQueries({
      orgError: new ApiMessageError('Status Page Organization Not Found', { code: 15, status: 200 })
    });
    renderPage();

    expect(await screen.findByText('The public status page has not been configured yet.')).toBeInTheDocument();
    expect(
      screen.queryByText('The service is unavailable. Check the backend connection and try again.')
    ).not.toBeInTheDocument();
  });

  it.each([
    ['HTTP failure', { orgError: new ApiMessageError('Request failed with status 503', { status: 503 }) }],
    ['network failure', { orgError: new ApiMessageError('Failed to fetch') }],
    ['component failure', { componentError: new ApiMessageError('Components unavailable', { status: 503 }) }],
    ['incident failure', { incidentError: new ApiMessageError('Incidents unavailable', { status: 503 }) }]
  ])('shows unavailable for %s', async (_name, errors) => {
    mockStatusQueries(errors);
    renderPage();

    expect(
      await screen.findByText('The service is unavailable. Check the backend connection and try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText('The public status page has not been configured yet.')).not.toBeInTheDocument();
  });

  it('shows a load error separately from transport unavailability', async () => {
    mockStatusQueries({ orgError: new ApiMessageError('Request rejected', { code: 4, status: 400 }) });
    renderPage();

    expect(await screen.findByText('This page could not be loaded. Retry or return to it later.')).toBeInTheDocument();
    expect(
      screen.queryByText('The service is unavailable. Check the backend connection and try again.')
    ).not.toBeInTheDocument();
  });

  it('shows invalid and permission failures separately from generic errors', async () => {
    mockStatusQueries({ orgResponse: { ...orgResponse(0), logo: undefined } });
    const invalid = renderPage();
    expect(
      await screen.findByText('The public status response is invalid and cannot be displayed.')
    ).toBeInTheDocument();
    invalid.unmount();

    mockStatusQueries({ orgError: new ApiMessageError('Forbidden', { status: 403 }) });
    renderPage();
    expect(await screen.findByText('The public status service refused this request.')).toBeInTheDocument();
  });

  it('does not render unsafe organization navigation, image or feedback schemes', async () => {
    mockStatusQueries({
      orgResponse: {
        ...orgResponse(0),
        home: 'javascript:alert(1)',
        logo: 'data:image/svg+xml,unsafe',
        feedback: 'javascript:alert(1)'
      }
    });
    renderPage();

    expect(
      await screen.findByText('The public status response is invalid and cannot be displayed.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'HertzBeat' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Feedback' })).not.toBeInTheDocument();
  });

  it('renders typed organization, component and incident states without numeric or false-health fallbacks', async () => {
    mockStatusQueries({
      orgResponse: orgResponse(2),
      componentResponse: [
        { info: { id: 1, name: 'Unknown component', state: 2 }, history: [] },
        { info: { id: 2, name: 'Future component', state: 9 }, history: [] }
      ],
      incidentResponse: {
        content: [incident(1, 'Active incident', 0), incident(2, 'Future incident', 9)],
        totalElements: 2,
        totalPages: 1,
        number: 0,
        size: 20
      }
    });
    renderPage();

    expect((await screen.findAllByText('Incident')).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Unknown')).toHaveLength(3);
    expect(screen.getByText('Investigating')).toBeInTheDocument();
    expect(screen.queryByText('Abnormal')).not.toBeInTheDocument();
    expect(screen.queryByText('9')).not.toBeInTheDocument();
  });

  it('does not invent organization health for an unsupported backend state', async () => {
    mockStatusQueries({ orgResponse: orgResponse(9) });
    renderPage();

    expect(await screen.findByText('Unknown')).toBeInTheDocument();
    expect(screen.queryByText('All systems operational')).not.toBeInTheDocument();
    expect(screen.queryByText('Service degradation')).not.toBeInTheDocument();
  });

  it('shows a load error instead of rendering a truncated incident collection', async () => {
    mockStatusQueries({
      incidentResponse: {
        content: [incident(1, 'Incident 1', 1)],
        totalElements: 2,
        totalPages: 1,
        number: 0,
        size: 20
      }
    });
    renderPage();

    expect(
      await screen.findByText('The public status response is invalid and cannot be displayed.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Incident 1')).not.toBeInTheDocument();
  });

  it('renders organization links, component history and the incident component/update timeline', async () => {
    mockStatusQueries({
      orgResponse: {
        ...orgResponse(0),
        home: 'https://hertzbeat.apache.org',
        feedback: 'ops@example.test'
      },
      componentResponse: [
        {
          info: { id: 1, name: 'Public API', state: 0 },
          history: [
            {
              componentId: 1,
              state: 0,
              timestamp: 1_700_000_000_000,
              uptime: 0.995,
              normal: 86_000,
              abnormal: 400,
              unknowing: 0
            }
          ]
        }
      ],
      incidentResponse: {
        content: [
          {
            ...incident(2, 'Gateway latency', 1),
            components: [{ id: 1, name: 'Public API', state: 1 }],
            contents: [
              {
                id: 3,
                incidentId: 2,
                message: 'Mitigation in progress',
                state: 2,
                timestamp: 1_700_000_100_000
              }
            ]
          }
        ],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 20
      }
    });
    renderPage();

    const logo = await screen.findByRole('img', { name: 'HertzBeat' });
    expect(logo.closest('a')).toHaveAttribute('href', 'https://hertzbeat.apache.org');
    expect(screen.getByRole('link', { name: 'Feedback' })).toHaveAttribute('href', 'mailto:ops@example.test');
    expect(screen.getByText('99.50%')).toBeInTheDocument();
    expect(screen.getByText('Mitigation in progress')).toBeInTheDocument();
    expect(screen.getAllByText('Public API').length).toBeGreaterThanOrEqual(2);
  });

  it('keeps an HTTPS feedback URL containing user information as HTTPS', async () => {
    mockStatusQueries({
      orgResponse: { ...orgResponse(0), feedback: 'https://user@example.test/help' }
    });
    renderPage();

    expect(await screen.findByRole('link', { name: 'Feedback' })).toHaveAttribute(
      'href',
      'https://user@example.test/help'
    );
  });

  it('cancels the old incident year and ignores its late response after switching', async () => {
    const currentYear = new Date().getFullYear();
    const historicalYear = currentYear - 1;
    const currentRange = createPublicStatusIncidentRange(currentYear);
    const historicalRange = createPublicStatusIncidentRange(historicalYear);
    const currentRequest = deferred<unknown>();
    let currentSignal: AbortSignal | undefined;
    apiMessageGet.mockImplementation((path: string, init?: { signal?: AbortSignal }) => {
      if (path.endsWith('/org')) return Promise.resolve(orgResponse(0));
      if (path.endsWith('/component')) return Promise.resolve([]);
      if (path.includes(`startTime=${currentRange.startTime}`)) {
        currentSignal = init?.signal;
        return currentRequest.promise;
      }
      if (path.includes(`startTime=${historicalRange.startTime}`)) {
        return Promise.resolve(incidentPage(incident(2, 'Historical incident', 3)));
      }
      throw new Error('Unexpected public status request');
    });
    renderPage();

    const year = await screen.findByRole('spinbutton', { name: 'Incident year' });
    fireEvent.change(year, { target: { value: String(historicalYear) } });

    expect(await screen.findByText('Historical incident')).toBeInTheDocument();
    expect(currentSignal?.aborted).toBe(true);
    currentRequest.resolve(incidentPage(incident(1, 'Late current incident', 0)));
    await waitFor(() => expect(screen.queryByText('Late current incident')).not.toBeInTheDocument());
  });

  it('explicitly refreshes only the currently selected incident year', async () => {
    mockStatusQueries({});
    renderPage();
    await screen.findByRole('spinbutton', { name: 'Incident year' });
    const initialPaths = apiMessageGet.mock.calls.map(([path]) => path as string);
    const incidentPath = initialPaths.find(path => path.includes('/incident?'));
    if (!incidentPath) throw new Error('Missing current incident request');

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => expect(apiMessageGet.mock.calls.filter(([path]) => path === incidentPath)).toHaveLength(2));
    expect(apiMessageGet.mock.calls.filter(([path]) => (path as string).endsWith('/org'))).toHaveLength(1);
    expect(apiMessageGet.mock.calls.filter(([path]) => (path as string).endsWith('/component'))).toHaveLength(1);
  });
});

type QueryErrors = {
  orgError?: Error;
  componentError?: Error;
  incidentError?: Error;
  orgResponse?: unknown;
  componentResponse?: unknown;
  incidentResponse?: unknown;
};

function mockStatusQueries(errors: QueryErrors) {
  apiMessageGet.mockImplementation((path: string) => {
    if (path.endsWith('/org')) {
      return errors.orgError ? Promise.reject(errors.orgError) : Promise.resolve(errors.orgResponse ?? orgResponse(0));
    }
    if (path.endsWith('/component')) {
      return errors.componentError
        ? Promise.reject(errors.componentError)
        : Promise.resolve(errors.componentResponse ?? []);
    }
    return errors.incidentError
      ? Promise.reject(errors.incidentError)
      : Promise.resolve(errors.incidentResponse ?? incidentPage());
  });
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <PublicStatusPage />
      </QueryClientProvider>
    </I18nextProvider>
  );
}

function orgResponse(state: number) {
  return { name: 'HertzBeat', description: 'Status', home: '/', logo: '/logo.svg', state };
}

function incident(id: number, name: string, state: number) {
  return { id, name, state, components: [], contents: [] };
}

function incidentPage(...content: unknown[]) {
  return {
    content,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    number: 0,
    size: 20
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
