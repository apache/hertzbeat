/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  loadInstrumentationCatalog: vi.fn(),
  loadIntakeProfiles: vi.fn(),
  renderInstrumentationGuide: vi.fn(),
  detectInstrumentationSignals: vi.fn()
}));
vi.mock('../api/instrumentation-api', () => api);

import { useInstrumentationPageController } from './use-instrumentation-page-controller';

describe('useInstrumentationPageController', () => {
  it('hydrates quick start from the catalog and reset without replacing application answers', async () => {
    api.loadInstrumentationCatalog.mockResolvedValue(catalog);
    api.loadIntakeProfiles.mockResolvedValue({
      schemaVersion: 2,
      status: 'available',
      defaultProfileId: 'server-default',
      profiles: [serverProfile]
    });
    const harness = createHarness();
    const { result } = renderHook(() => useInstrumentationPageController(), { wrapper: harness.wrapper });
    await waitFor(() => expect(result.current.draft.recipeId).toBe('telemetrygen'));
    expect(result.current.draft).toMatchObject({
      sourceKind: 'quick_start',
      environment: 'docker',
      platform: 'linux_amd64',
      intakeProfileId: 'server-default'
    });

    act(() => result.current.chooseSource('application'));
    act(() => result.current.answerApplication('language', 'java'));
    act(() => void harness.client.setQueryData(['instrumentation', 'v2', 'catalog'], { ...catalog }));
    expect(result.current.draft).toMatchObject({ sourceKind: 'application', language: 'java' });
    expect(result.current.draft.framework).toBeUndefined();

    act(() => result.current.reset());
    expect(result.current.draft).toMatchObject({
      sourceKind: 'quick_start',
      recipeId: 'telemetrygen',
      environment: 'docker',
      platform: 'linux_amd64',
      intakeProfileId: 'server-default'
    });
  });

  it('keeps the application cascade unresolved until the final compatible answer', async () => {
    api.loadInstrumentationCatalog.mockResolvedValue(catalog);
    api.loadIntakeProfiles.mockResolvedValue({
      schemaVersion: 2,
      status: 'available',
      defaultProfileId: 'server-default',
      profiles: [serverProfile]
    });
    const { result } = renderHook(() => useInstrumentationPageController(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.catalogState).toBe('ready'));

    act(() => result.current.chooseSource('application'));
    expect(result.current.draft.recipeId).toBeUndefined();
    expect(result.current.canContinueSource).toBe(false);
    act(() => result.current.answerApplication('language', 'java'));
    act(() => result.current.answerApplication('framework', 'spring_boot'));
    act(() => result.current.answerApplication('method', 'zero_code'));
    act(() => result.current.answerApplication('environment', 'docker'));
    expect(result.current.draft.recipeId).toBeUndefined();
    act(() => result.current.answerApplication('platform', 'linux_amd64'));
    expect(result.current.draft.recipeId).toBe('java_spring');
    expect(result.current.canContinueSource).toBe(true);

    act(() => result.current.answerApplication('language', 'nodejs'));
    expect(result.current.draft).toMatchObject({ language: 'nodejs' });
    expect(result.current.draft.framework).toBeUndefined();
    expect(result.current.draft.recipeId).toBeUndefined();
  });
});

function createWrapper() {
  return createHarness().wrapper;
}

function createHarness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
  return { client, wrapper };
}

const serverProfile = {
  id: 'server-default',
  kind: 'server',
  availability: 'available',
  gateway: 'server',
  supportedTransports: ['http_protobuf'],
  httpsEndpoints: { http_protobuf: 'https://example.test/otlp' },
  authHeaderName: 'Authorization'
};
const sources = [
  {
    kind: 'quick_start',
    labelKey: 'instrumentation.v2.source.quick_start',
    descriptionKey: 'instrumentation.v2.source.quick_start_description'
  },
  {
    kind: 'application',
    labelKey: 'instrumentation.v2.source.application',
    descriptionKey: 'instrumentation.v2.source.application_description'
  },
  {
    kind: 'existing_opentelemetry',
    labelKey: 'instrumentation.v2.source.existing_opentelemetry',
    descriptionKey: 'instrumentation.v2.source.existing_opentelemetry_description'
  }
] as const;
const recipe = (id: string, language: string, framework: string) => ({
  id,
  kind: 'application' as const,
  labelKey: `instrumentation.v2.recipe.${id}`,
  preview: false,
  language,
  framework,
  method: 'zero_code',
  environments: ['docker'],
  platforms: ['linux_amd64'],
  signals: { metrics: 'supported' as const, logs: 'supported' as const, traces: 'supported' as const },
  components: [],
  blocksPreview: ['environment' as const]
});
const quickRecipe = {
  ...recipe('telemetrygen', 'shell', 'telemetrygen'),
  kind: 'quick_start' as const
};
const catalog = {
  schemaVersion: 2,
  sources,
  recipes: [quickRecipe, recipe('java_spring', 'java', 'spring_boot'), recipe('node_express', 'nodejs', 'express')]
};
