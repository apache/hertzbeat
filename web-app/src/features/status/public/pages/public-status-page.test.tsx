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
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

const { apiMessageGet } = vi.hoisted(() => ({ apiMessageGet: vi.fn() }));
vi.mock('@/core/http/api-message', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  apiMessageGet
}));

import { ApiMessageError } from '@/core/http/api-message';

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
    expect(screen.queryByText('The service is unavailable. Check the backend connection and try again.'))
      .not.toBeInTheDocument();
  });

  it.each([
    ['HTTP failure', { orgError: new ApiMessageError('Request failed with status 503', { status: 503 }) }],
    ['network failure', { orgError: new ApiMessageError('Failed to fetch') }],
    ['component failure', { componentError: new ApiMessageError('Components unavailable', { status: 503 }) }],
    ['incident failure', { incidentError: new ApiMessageError('Incidents unavailable', { status: 503 }) }]
  ])('shows unavailable for %s', async (_name, errors) => {
    mockStatusQueries(errors);
    renderPage();

    expect(await screen.findByText('The service is unavailable. Check the backend connection and try again.'))
      .toBeInTheDocument();
    expect(screen.queryByText('The public status page has not been configured yet.')).not.toBeInTheDocument();
  });
});

type QueryErrors = {
  orgError?: Error;
  componentError?: Error;
  incidentError?: Error;
};

function mockStatusQueries(errors: QueryErrors) {
  apiMessageGet.mockImplementation((path: string) => {
    if (path.endsWith('/org')) {
      return errors.orgError
        ? Promise.reject(errors.orgError)
        : Promise.resolve({ name: 'HertzBeat', description: 'Status', state: 0 });
    }
    if (path.endsWith('/component')) {
      return errors.componentError ? Promise.reject(errors.componentError) : Promise.resolve([]);
    }
    return errors.incidentError
      ? Promise.reject(errors.incidentError)
      : Promise.resolve({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
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
