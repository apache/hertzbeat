/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

const api = vi.hoisted(() => ({
  loadInstrumentationCatalog: vi.fn(),
  loadIntakeProfiles: vi.fn(),
  renderInstrumentationGuide: vi.fn(),
  detectInstrumentationSignals: vi.fn()
}));
vi.mock('../api/instrumentation-api', () => api);
const tokenApi = vi.hoisted(() => ({ generateAccessToken: vi.fn() }));
vi.mock('@/shared/access-token/access-token-generation-api', () => tokenApi);
const auth = vi.hoisted(() => ({ roles: ['ADMIN'] as string[] }));
vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({ session: { authenticated: true, roles: auth.roles } })
}));

import { useInstrumentationPageController } from './use-instrumentation-page-controller';

describe('useInstrumentationPageController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.roles = ['ADMIN'];
  });

  it('starts and resets without implicitly selecting quick start', async () => {
    api.loadInstrumentationCatalog.mockResolvedValue(catalog);
    api.loadIntakeProfiles.mockResolvedValue({
      schemaVersion: 2,
      status: 'available',
      defaultProfileId: 'server-default',
      profiles: [serverProfile]
    });
    const harness = createHarness();
    const { result } = renderHook(() => useInstrumentationPageController(), { wrapper: harness.wrapper });
    await waitFor(() => expect(result.current.catalogState).toBe('ready'));
    await waitFor(() => expect(result.current.draft.intakeProfileId).toBe('server-default'));
    expect(harness.client.getQueryData(['instrumentation', 'catalog'])).toEqual(catalog);
    expect(harness.client.getQueryData(['instrumentation', 'intake-profiles'])).toMatchObject({
      defaultProfileId: 'server-default'
    });
    expect(harness.client.getQueryData(['instrumentation', 'v2', 'catalog'])).toBeUndefined();
    expect(result.current.draft).toMatchObject({ intakeProfileId: 'server-default' });
    expect(result.current.draft.sourceKind).toBeUndefined();
    expect(result.current.draft.sourceId).toBeUndefined();
    expect(result.current.draft.recipeId).toBeUndefined();
    expect(result.current.canContinueSource).toBe(false);
    expect(result.current.sourceDirectoryRevision).toBe(0);

    act(() => result.current.chooseSource('java'));
    act(() => result.current.answerApplication('framework', 'java_jar'));
    act(() => void harness.client.setQueryData(['instrumentation', 'catalog'], { ...catalog }));
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
    expect(result.current.draft).toMatchObject({ intakeProfileId: 'server-default' });
    expect(result.current.draft.sourceKind).toBeUndefined();
    expect(result.current.draft.sourceId).toBeUndefined();
    expect(result.current.draft.recipeId).toBeUndefined();
    expect(result.current.canContinueSource).toBe(false);
    expect(result.current.sourceDirectoryRevision).toBe(1);
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
    await waitFor(() => expect(result.current.catalogState).toBe('ready'));
    act(() => result.current.chooseSource('quick_start'));
    expect(result.current.draft.recipeId).toBe('telemetrygen');
    act(() => result.current.setStage('configure'));
    act(() => result.current.patchService({ name: 'checkout' }));

    await act(async () => result.current.renderGuide());
    now.mockReturnValue(5_000);
    await act(async () => result.current.detect());
    expect(api.detectInstrumentationSignals).toHaveBeenLastCalledWith(expect.objectContaining({ startedAt: 1_000 }));

    now.mockReturnValue(6_000);
    await act(async () => result.current.detect());
    expect(api.detectInstrumentationSignals).toHaveBeenLastCalledWith(expect.objectContaining({ startedAt: 1_000 }));

    act(() => result.current.goBack());
    expect(result.current.stage).toBe('source');
    act(() => result.current.setStage('configure'));
    now.mockReturnValue(7_000);
    await act(async () => result.current.renderGuide());
    now.mockReturnValue(8_000);
    await act(async () => result.current.detect());
    expect(api.detectInstrumentationSignals).toHaveBeenLastCalledWith(expect.objectContaining({ startedAt: 7_000 }));
    now.mockRestore();
  });

  it.each([
    ['name', 'cart'],
    ['namespace', 'commerce'],
    ['environment', 'staging'],
    ['serviceInstanceId', 'checkout-8'],
    ['endpoint', '/v2/checkout']
  ] as const)('retires guide, detection, and detection window when service %s changes', async (field, value) => {
    api.loadInstrumentationCatalog.mockResolvedValue(catalog);
    api.loadIntakeProfiles.mockResolvedValue({
      schemaVersion: 2,
      status: 'available',
      defaultProfileId: 'server-default',
      profiles: [serverProfile]
    });
    api.renderInstrumentationGuide.mockResolvedValue({ schemaVersion: 2 });
    api.detectInstrumentationSignals.mockResolvedValue({
      polling: { decision: 'continue_polling', pollAfterMs: 30_000, deadlineAt: Date.now() + 60_000 },
      queryJumps: []
    });
    const { result } = renderHook(() => useInstrumentationPageController(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.catalogState).toBe('ready'));
    act(() => result.current.chooseSource('quick_start'));
    act(() => result.current.patchService({ name: 'checkout' }));
    await act(async () => result.current.renderGuide());
    await act(async () => result.current.detect());
    expect(result.current.guide).toBeDefined();
    expect(result.current.detection).toBeDefined();
    expect(result.current.detecting).toBe(true);
    const localStorageBefore = storageSnapshot(window.localStorage);
    const sessionStorageBefore = storageSnapshot(window.sessionStorage);
    const locationBefore = window.location.href;

    act(() => result.current.patchService({ [field]: value }));

    expect(result.current.draft.service[field]).toBe(value);
    expect(result.current.guide).toBeUndefined();
    expect(result.current.detection).toBeUndefined();
    expect(result.current.detecting).toBe(false);
    await act(async () => result.current.detect());
    expect(api.detectInstrumentationSignals).toHaveBeenCalledOnce();
    expect(result.current.detectionError).toBe(true);
    expect(storageSnapshot(window.localStorage)).toEqual(localStorageBefore);
    expect(storageSnapshot(window.sessionStorage)).toEqual(sessionStorageBefore);
    expect(window.location.href).toBe(locationBefore);
  });

  it('suppresses a late guide receipt after the service context epoch retires', async () => {
    api.loadInstrumentationCatalog.mockResolvedValue(catalog);
    api.loadIntakeProfiles.mockResolvedValue({
      schemaVersion: 2,
      status: 'available',
      defaultProfileId: 'server-default',
      profiles: [serverProfile]
    });
    const guideReceipt = deferred<{ schemaVersion: number }>();
    api.renderInstrumentationGuide.mockReturnValue(guideReceipt.promise);
    const { result } = renderHook(() => useInstrumentationPageController(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.catalogState).toBe('ready'));
    act(() => result.current.chooseSource('quick_start'));
    act(() => result.current.patchService({ name: 'checkout' }));
    let rendering: Promise<void> | undefined;
    act(() => {
      rendering = result.current.renderGuide();
    });

    act(() => result.current.patchService({ environment: 'production' }));
    await act(async () => {
      guideReceipt.resolve({ schemaVersion: 2 });
      await rendering;
    });

    expect(result.current.guide).toBeUndefined();
    expect(result.current.rendering).toBe(false);
  });

  it('suppresses a late detection receipt after the service context epoch retires', async () => {
    api.loadInstrumentationCatalog.mockResolvedValue(catalog);
    api.loadIntakeProfiles.mockResolvedValue({
      schemaVersion: 2,
      status: 'available',
      defaultProfileId: 'server-default',
      profiles: [serverProfile]
    });
    api.renderInstrumentationGuide.mockResolvedValue({ schemaVersion: 2 });
    const detectionReceipt = deferred<{
      polling: { decision: 'complete'; deadlineAt: number };
      queryJumps: [];
    }>();
    api.detectInstrumentationSignals.mockReturnValue(detectionReceipt.promise);
    const { result } = renderHook(() => useInstrumentationPageController(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.catalogState).toBe('ready'));
    act(() => result.current.chooseSource('quick_start'));
    act(() => result.current.patchService({ name: 'checkout' }));
    await act(async () => result.current.renderGuide());
    let detecting: Promise<void> | undefined;
    act(() => {
      detecting = result.current.detect();
    });

    act(() => result.current.patchService({ endpoint: '/checkout' }));
    await act(async () => {
      detectionReceipt.resolve({
        polling: { decision: 'complete', deadlineAt: Date.now() + 60_000 },
        queryJumps: []
      });
      await detecting;
    });

    expect(result.current.detection).toBeUndefined();
    expect(result.current.detecting).toBe(false);
    expect(result.current.detectionError).toBe(false);
  });

  it('keeps a generated token in controller memory only and clears it at every Configure boundary', async () => {
    api.loadInstrumentationCatalog.mockResolvedValue(catalog);
    api.loadIntakeProfiles.mockResolvedValue({
      schemaVersion: 2,
      status: 'available',
      defaultProfileId: 'server-default',
      profiles: [
        serverProfile,
        { ...serverProfile, id: 'collector-edge', kind: 'hertzbeat_collector', gateway: 'collector' }
      ]
    });
    api.renderInstrumentationGuide.mockResolvedValue({ schemaVersion: 2 });
    tokenApi.generateAccessToken.mockResolvedValue({ id: 'generated', token: 'hb_generated_once' });
    const { result, unmount } = renderHook(() => useInstrumentationPageController(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.catalogState).toBe('ready'));

    act(() => result.current.chooseSource('quick_start'));
    act(() => result.current.setStage('configure'));
    act(() => result.current.patchService({ name: 'checkout' }));
    expect(result.current.canRender).toBe(false);
    act(() => result.current.openTokenGenerator());
    act(() =>
      result.current.updateTokenDraft({ name: 'Checkout ingest', expireSeconds: 2_592_000, scope: 'otlp-ingest' })
    );
    await act(async () => result.current.generateToken());

    expect(result.current.canGenerateToken).toBe(true);
    expect(tokenApi.generateAccessToken).toHaveBeenCalledWith({
      name: 'Checkout ingest',
      expireSeconds: 2_592_000,
      scope: 'otlp-ingest'
    });
    expect(result.current.tokenDraft).toBeUndefined();
    expect(result.current.token).toBe('hb_generated_once');
    expect(result.current.canRender).toBe(true);
    await act(async () => result.current.renderGuide());
    expect(JSON.stringify(api.renderInstrumentationGuide.mock.calls)).not.toContain('hb_generated_once');

    act(() => result.current.patchService({ name: 'cart' }));
    expect(result.current.token).toBe('');
    await act(async () => result.current.generateToken());
    expect(result.current.token).toBe('');

    act(() => result.current.openTokenGenerator());
    act(() => result.current.updateTokenDraft({ name: 'Cart ingest', expireSeconds: -1, scope: 'otlp-ingest' }));
    await act(async () => result.current.generateToken());
    expect(result.current.token).toBe('hb_generated_once');
    act(() => result.current.patchDraft({ intakeProfileId: 'collector-edge' }));
    expect(result.current.token).toBe('');

    act(() => result.current.openTokenGenerator());
    act(() => result.current.updateTokenDraft({ name: 'Collector ingest', expireSeconds: -1, scope: 'otlp-ingest' }));
    await act(async () => result.current.generateToken());
    act(() => result.current.goBack());
    expect(result.current.stage).toBe('source');
    expect(result.current.token).toBe('');
    unmount();
  });

  it.each(['USER', 'GUEST'])('keeps manual token entry available without admitting generation for %s', async role => {
    auth.roles = [role];
    api.loadInstrumentationCatalog.mockResolvedValue(catalog);
    api.loadIntakeProfiles.mockResolvedValue({
      schemaVersion: 2,
      status: 'available',
      defaultProfileId: 'server-default',
      profiles: [serverProfile]
    });
    const { result } = renderHook(() => useInstrumentationPageController(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.catalogState).toBe('ready'));

    act(() => result.current.setToken('existing-otlp-token'));
    act(() => result.current.openTokenGenerator());
    await act(async () => result.current.generateToken());

    expect(result.current.canGenerateToken).toBe(false);
    expect(result.current.token).toBe('existing-otlp-token');
    expect(result.current.tokenDraft).toBeUndefined();
    expect(tokenApi.generateAccessToken).not.toHaveBeenCalled();
  });

  it('retires an in-flight generation when ADMIN capability is lost and ignores the late receipt', async () => {
    api.loadInstrumentationCatalog.mockResolvedValue(catalog);
    api.loadIntakeProfiles.mockResolvedValue({
      schemaVersion: 2,
      status: 'available',
      defaultProfileId: 'server-default',
      profiles: [serverProfile]
    });
    const receipt = deferred<{ id: 'generated'; token: string }>();
    tokenApi.generateAccessToken.mockReturnValue(receipt.promise);
    const localStorageBefore = storageSnapshot(window.localStorage);
    const sessionStorageBefore = storageSnapshot(window.sessionStorage);
    const locationBefore = window.location.href;
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const { result, rerender } = renderHook(() => useInstrumentationPageController(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.catalogState).toBe('ready'));

    act(() => result.current.setToken('existing-otlp-token'));
    act(() => result.current.openTokenGenerator());
    act(() => result.current.updateTokenDraft({ name: 'Late receipt', expireSeconds: -1, scope: 'otlp-ingest' }));
    let generation: Promise<void> | undefined;
    act(() => {
      generation = result.current.generateToken();
    });
    auth.roles = ['USER'];
    rerender();

    expect(result.current.canGenerateToken).toBe(false);
    expect(result.current).toMatchObject({
      token: 'existing-otlp-token',
      tokenDraft: undefined,
      tokenGenerating: false,
      tokenError: false
    });
    await act(async () => {
      receipt.resolve({ id: 'generated', token: 'late-generation-secret' });
      await generation;
    });
    expect(result.current).toMatchObject({
      token: 'existing-otlp-token',
      tokenDraft: undefined,
      tokenGenerating: false,
      tokenError: false
    });
    expect(storageSnapshot(window.localStorage)).toEqual(localStorageBefore);
    expect(storageSnapshot(window.sessionStorage)).toEqual(sessionStorageBefore);
    expect(window.location.href).toBe(locationBefore);
    expect(JSON.stringify(log.mock.calls)).not.toContain('late-generation-secret');
    log.mockRestore();
  });

  it('rejects retained ADMIN token commands after generation capability is lost', async () => {
    api.loadInstrumentationCatalog.mockResolvedValue(catalog);
    api.loadIntakeProfiles.mockResolvedValue({
      schemaVersion: 2,
      status: 'available',
      defaultProfileId: 'server-default',
      profiles: [serverProfile]
    });
    const { result, rerender } = renderHook(() => useInstrumentationPageController(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.catalogState).toBe('ready'));
    const retained = {
      open: result.current.openTokenGenerator,
      update: result.current.updateTokenDraft,
      generate: result.current.generateToken
    };

    auth.roles = ['USER'];
    rerender();
    act(() => retained.open());
    act(() => retained.update({ name: 'Retained ADMIN command', expireSeconds: -1, scope: 'otlp-ingest' }));
    await act(async () => retained.generate());

    expect(result.current).toMatchObject({
      tokenDraft: undefined,
      tokenGenerating: false,
      tokenError: false
    });
    expect(tokenApi.generateAccessToken).not.toHaveBeenCalled();
  });

  it('does not retire an unrelated guide render when token-generation capability is lost', async () => {
    api.loadInstrumentationCatalog.mockResolvedValue(catalog);
    api.loadIntakeProfiles.mockResolvedValue({
      schemaVersion: 2,
      status: 'available',
      defaultProfileId: 'server-default',
      profiles: [serverProfile]
    });
    const guideReceipt = deferred<{ schemaVersion: number }>();
    api.renderInstrumentationGuide.mockReturnValue(guideReceipt.promise);
    const { result, rerender } = renderHook(() => useInstrumentationPageController(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.catalogState).toBe('ready'));
    act(() => result.current.chooseSource('quick_start'));
    act(() => result.current.setStage('configure'));
    act(() => result.current.patchService({ name: 'checkout' }));
    let rendering: Promise<void> | undefined;
    act(() => {
      rendering = result.current.renderGuide();
    });

    auth.roles = ['USER'];
    rerender();
    await act(async () => {
      guideReceipt.resolve({ schemaVersion: 2 });
      await rendering;
    });

    expect(result.current.canGenerateToken).toBe(false);
    expect(result.current.guide).toEqual({ schemaVersion: 2 });
    expect(result.current.rendering).toBe(false);
  });

  it.each([
    ['HTTP 403', new ApiMessageError('private denial body', { status: 403 })],
    ['explicit rejection', new ApiMessageError('private rejection body', { code: 20, status: 200 })]
  ])('publishes only fixed local error state for %s', async (_label, rejection) => {
    api.loadInstrumentationCatalog.mockResolvedValue(catalog);
    api.loadIntakeProfiles.mockResolvedValue({
      schemaVersion: 2,
      status: 'available',
      defaultProfileId: 'server-default',
      profiles: [serverProfile]
    });
    tokenApi.generateAccessToken.mockRejectedValue(rejection);
    const localStorageBefore = storageSnapshot(window.localStorage);
    const sessionStorageBefore = storageSnapshot(window.sessionStorage);
    const locationBefore = window.location.href;
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const { result } = renderHook(() => useInstrumentationPageController(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.catalogState).toBe('ready'));

    act(() => result.current.openTokenGenerator());
    act(() => result.current.updateTokenDraft({ name: 'Rejected', expireSeconds: -1, scope: 'otlp-ingest' }));
    await act(async () => result.current.generateToken());

    expect(result.current).toMatchObject({ token: '', tokenError: true, tokenGenerating: false });
    expect(JSON.stringify(result.current)).not.toContain('private');
    expect(storageSnapshot(window.localStorage)).toEqual(localStorageBefore);
    expect(storageSnapshot(window.sessionStorage)).toEqual(sessionStorageBefore);
    expect(window.location.href).toBe(locationBefore);
    expect(JSON.stringify(log.mock.calls)).not.toContain('private');
    log.mockRestore();
  });

  it('discards an in-flight token after session-loss unmount without persistence or URL leakage', async () => {
    api.loadInstrumentationCatalog.mockResolvedValue(catalog);
    api.loadIntakeProfiles.mockResolvedValue({
      schemaVersion: 2,
      status: 'available',
      defaultProfileId: 'server-default',
      profiles: [serverProfile]
    });
    let resolveToken: ((value: { id: string; token: string }) => void) | undefined;
    tokenApi.generateAccessToken.mockReturnValue(
      new Promise(resolve => {
        resolveToken = resolve;
      })
    );
    const localStorageBefore = storageSnapshot(window.localStorage);
    const sessionStorageBefore = storageSnapshot(window.sessionStorage);
    const locationBefore = window.location.href;
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const harness = createHarness();
    const { result, unmount } = renderHook(() => useInstrumentationPageController(), { wrapper: harness.wrapper });
    await waitFor(() => expect(result.current.catalogState).toBe('ready'));

    act(() => result.current.openTokenGenerator());
    act(() =>
      result.current.updateTokenDraft({ name: 'Session scoped', expireSeconds: 2_592_000, scope: 'otlp-ingest' })
    );
    let generation: Promise<void> | undefined;
    act(() => {
      generation = result.current.generateToken();
    });
    unmount();
    await act(async () => {
      resolveToken?.({ id: 'generated', token: 'hb_session_loss_secret' });
      await generation;
    });

    expect(storageSnapshot(window.localStorage)).toEqual(localStorageBefore);
    expect(storageSnapshot(window.sessionStorage)).toEqual(sessionStorageBefore);
    expect(window.location.href).toBe(locationBefore);
    expect(JSON.stringify(harness.client.getQueryCache().getAll())).not.toContain('hb_session_loss_secret');
    expect(JSON.stringify(log.mock.calls)).not.toContain('hb_session_loss_secret');
    log.mockRestore();
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

function storageSnapshot(storage: Storage) {
  return Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => Boolean(key))
    .sort()
    .map(key => [key, storage.getItem(key)]);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

const serverProfile = {
  id: 'server-default',
  kind: 'server',
  availability: 'available',
  gateway: 'server',
  supportedTransports: ['http_protobuf'],
  endpoints: { http_protobuf: { url: 'https://example.test/otlp', security: 'tls' as const } },
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
