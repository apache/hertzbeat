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
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { loadInstrumentationCatalog } = vi.hoisted(() => ({ loadInstrumentationCatalog: vi.fn() }));
vi.mock('../api/instrumentation-api', () => ({ loadInstrumentationCatalog }));

import { useInstrumentationCatalogController } from './use-instrumentation-catalog-controller';

afterEach(() => vi.clearAllMocks());

describe('instrumentation catalog controller', () => {
  it('loads the v1 catalog and normalizes a language to its stable compatible method', async () => {
    loadInstrumentationCatalog.mockResolvedValue(catalog);
    const { result } = renderHook(() => useInstrumentationCatalogController(), { wrapper: queryWrapper() });

    expect(result.current.state.status).toBe('loading');
    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    act(() => result.current.setLanguage('go'));
    expect(result.current.draft.selection).toMatchObject({
      language: 'go', framework: 'go_generic', method: 'sdk', environment: 'docker', platform: 'linux_amd64'
    });

    act(() => result.current.setMethod('ebpf'));
    expect(result.current.draft.selection?.method).toBe('ebpf');
    expect(loadInstrumentationCatalog).toHaveBeenCalledTimes(1);
  });

  it('keeps selection unavailable until catalog loading succeeds', async () => {
    loadInstrumentationCatalog.mockRejectedValue(new Error('backend unavailable'));
    const { result } = renderHook(() => useInstrumentationCatalogController(), { wrapper: queryWrapper() });

    act(() => result.current.setLanguage('go'));
    expect(result.current.draft.selection).toBeUndefined();
    await waitFor(() => expect(result.current.state.status).toBe('error'));
  });

  it('reconciles a stale selection after the catalog is refreshed', async () => {
    loadInstrumentationCatalog
      .mockResolvedValueOnce(catalog)
      .mockResolvedValueOnce(catalogWithoutEbpf);
    const { result } = renderHook(() => useInstrumentationCatalogController(), { wrapper: queryWrapper() });
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    act(() => result.current.setLanguage('go'));
    act(() => result.current.setMethod('ebpf'));
    expect(result.current.draft.selection?.method).toBe('ebpf');

    await act(async () => void await result.current.retry());

    await waitFor(() => expect(result.current.draft.selection?.method).toBe('sdk'));
  });
});

function queryWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const component = {
  name: 'OpenTelemetry Go SDK', sourceUrl: 'https://opentelemetry.io/', version: '1.43.0',
  versionPolicy: 'pinned', license: 'Apache-2.0', installationLocationKey: 'instrumentation.location.application_host',
  official: true, bundledWithHertzBeat: false, dependencies: [], artifacts: []
};

const catalog = {
  schemaVersion: 1,
  languages: [{ language: 'go', labelKey: 'instrumentation.language.go', frameworks: [{
    framework: 'go_generic', labelKey: 'instrumentation.framework.go_generic', methods: [
      {
        method: 'ebpf', labelKey: 'instrumentation.method.ebpf', preview: true,
        environments: ['docker'], platforms: ['linux_amd64'],
        signals: { metrics: 'unsupported', logs: 'unsupported', traces: 'preview' }, component
      },
      {
        method: 'sdk', labelKey: 'instrumentation.method.sdk', preview: false,
        environments: ['docker'], platforms: ['linux_amd64'],
        signals: { metrics: 'supported', logs: 'preview', traces: 'supported' }, component
      }
    ]
  }] }]
};

const catalogWithoutEbpf = {
  ...catalog,
  languages: catalog.languages.map(language => ({
    ...language,
    frameworks: language.frameworks.map(framework => ({
      ...framework,
      methods: framework.methods.filter(method => method.method !== 'ebpf')
    }))
  }))
};
