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

    act(() => result.current.chooseSource('java'));
    act(() => result.current.answerApplication('framework', 'java_jar'));
    act(() => void harness.client.setQueryData(['instrumentation', 'v2', 'catalog'], { ...catalog }));
    expect(result.current.draft).toMatchObject({
      sourceId: 'java',
      sourceKind: 'application',
      language: 'java',
      framework: 'java_jar'
    });

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const block = {
      id: 'configure',
      type: 'code' as const,
      titleKey: 'instrumentation.v2.block.configure',
      executionLocationKey: 'instrumentation.location.application',
      content: 'Authorization=valid-token-marker:${HERTZBEAT_TOKEN}',
      placeholders: ['authorizationToken' as const]
    };
    act(() => result.current.setToken('valid-token-123'));
    await act(async () => result.current.copyBlock(block));
    expect(writeText).toHaveBeenCalledWith('Authorization=valid-token-marker:valid-token-123');
    expect(block.content).toContain('${HERTZBEAT_TOKEN}');

    act(() => result.current.reset());
    expect(result.current.token).toBe('');
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

    act(() => result.current.chooseSource('java'));
    expect(result.current.draft.recipeId).toBeUndefined();
    expect(result.current.canContinueSource).toBe(false);
    act(() => result.current.answerApplication('framework', 'spring_boot'));
    expect(result.current.draft.recipeId).toBe('java_spring');
    expect(result.current.canContinueSource).toBe(true);

    act(() => result.current.chooseSource('nodejs'));
    expect(result.current.draft).toMatchObject({ sourceId: 'nodejs', language: 'nodejs', recipeId: 'node_express' });
  });

  it('freezes the detection window when the guide is ready and reuses it for polling', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    api.loadInstrumentationCatalog.mockResolvedValue(catalog);
    api.loadIntakeProfiles.mockResolvedValue({
      schemaVersion: 2,
      status: 'available',
      defaultProfileId: 'server-default',
      profiles: [serverProfile]
    });
    api.renderInstrumentationGuide.mockResolvedValue({ schemaVersion: 2 });
    api.detectInstrumentationSignals.mockResolvedValue({
      polling: { decision: 'complete', deadlineAt: 10_000 }
    });
    const { result } = renderHook(() => useInstrumentationPageController(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.draft.recipeId).toBe('telemetrygen'));
    act(() =>
      result.current.patchService({
        name: 'checkout',
        namespace: 'shop',
        environment: 'prod'
      })
    );

    await act(async () => result.current.renderGuide());
    now.mockReturnValue(5_000);
    await act(async () => result.current.detect());
    expect(api.detectInstrumentationSignals).toHaveBeenLastCalledWith(expect.objectContaining({ startedAt: 1_000 }));

    now.mockReturnValue(6_000);
    await act(async () => result.current.detect());
    expect(api.detectInstrumentationSignals).toHaveBeenLastCalledWith(expect.objectContaining({ startedAt: 1_000 }));

    act(() => result.current.goBack());
    expect(result.current.stage).toBe('context');
    now.mockReturnValue(7_000);
    await act(async () => result.current.renderGuide());
    now.mockReturnValue(8_000);
    await act(async () => result.current.detect());
    expect(api.detectInstrumentationSignals).toHaveBeenLastCalledWith(expect.objectContaining({ startedAt: 7_000 }));
    now.mockRestore();
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
const groups = [
  { id: 'quick_start', labelKey: 'instrumentation.v2.directory.group.quick_start' },
  { id: 'applications', labelKey: 'instrumentation.v2.directory.group.applications' }
] as const;
const sources = [
  {
    id: 'quick_start',
    labelKey: 'instrumentation.v2.directory.source.quick_start',
    descriptionKey: 'instrumentation.v2.directory.source.quick_start_description',
    iconKey: 'quick-start',
    groupIds: ['quick_start'],
    support: 'supported',
    sourceKind: 'quick_start',
    recipeIds: ['telemetrygen'],
    signals: { metrics: 'supported', logs: 'supported', traces: 'supported' }
  },
  {
    id: 'java',
    labelKey: 'instrumentation.v2.directory.source.java',
    descriptionKey: 'instrumentation.v2.directory.source.java_description',
    iconKey: 'java',
    groupIds: ['applications'],
    support: 'supported',
    sourceKind: 'application',
    recipeIds: ['java_spring', 'java_jar'],
    signals: { metrics: 'supported', logs: 'supported', traces: 'supported' }
  },
  {
    id: 'nodejs',
    labelKey: 'instrumentation.v2.directory.source.nodejs',
    descriptionKey: 'instrumentation.v2.directory.source.nodejs_description',
    iconKey: 'nodejs',
    groupIds: ['applications'],
    support: 'supported',
    sourceKind: 'application',
    recipeIds: ['node_express'],
    signals: { metrics: 'supported', logs: 'supported', traces: 'supported' }
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
  groups,
  sources,
  recipes: [
    quickRecipe,
    recipe('java_spring', 'java', 'spring_boot'),
    recipe('java_jar', 'java', 'java_jar'),
    recipe('node_express', 'nodejs', 'express')
  ]
};
