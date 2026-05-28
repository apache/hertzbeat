import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    initial: {
      entity: { type: 'service', name: 'checkout-api' },
      identities: [],
      monitorBinds: [],
      relations: []
    },
    catalogSuggestions: {
      owners: ['platform']
    }
  }
}));

const readSeedMonitor = vi.hoisted(() => vi.fn(async () => ({ id: 42, app: 'website', name: 'checkout', instance: 'example.com' })));
const readEntityCatalogSuggestions = vi.hoisted(() => vi.fn(async () => mockState.renderData.catalogSuggestions));
const buildEntityEditorNewDraftFromFacade = vi.hoisted(() => vi.fn(async () => mockState.renderData.initial));
const loadEntityEditorCatalogSuggestionsFromFacade = vi.hoisted(() =>
  vi.fn(async (readCatalogSuggestions: () => Promise<unknown>) => readCatalogSuggestions())
);

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock()
  })
}));

vi.mock('@/components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load,
    cacheKey,
    cacheSettledTtlMs,
    loadingCopy
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
    cacheKey?: string;
    cacheSettledTtlMs?: number;
    loadingCopy?: string;
  }) => {
    mockState.lastLoad = load;
    return (
      <div
        data-client-workbench="true"
        data-cache-key={cacheKey}
        data-cache-settled-ttl={cacheSettledTtlMs}
        data-loading-copy={loadingCopy}
      >
        {children(mockState.renderData)}
      </div>
    );
  }
}));

vi.mock('@/components/pages/entity-editor-surface', () => ({
  EntityEditorSurface: ({ mode, entityId, initial }: any) => (
    <div data-entity-editor-surface={mode} data-entity-id={entityId ?? 'new'}>
      {initial.entity.name}
    </div>
  )
}));

vi.mock('@/lib/api-facade', () => ({
  api: {
    monitors: {
      detail: readSeedMonitor
    },
    entities: {
      catalogSuggestions: readEntityCatalogSuggestions
    }
  }
}));

vi.mock('@/lib/entity-editor/controller', () => ({
  buildEntityEditorCatalogSuggestionsUrl: () => '/entities/catalog-suggestions?limit=120',
  buildEntityEditorNewDraftFromFacade,
  buildEntityEditorSeedMonitorUrl: (monitorId: string) => `/monitor/${monitorId}`,
  loadEntityEditorCatalogSuggestionsFromFacade
}));

describe('EntityNewPage', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    readSeedMonitor.mockClear().mockResolvedValue({ id: 42, app: 'website', name: 'checkout', instance: 'example.com' });
    readEntityCatalogSuggestions.mockClear().mockResolvedValue(mockState.renderData.catalogSuggestions);
    buildEntityEditorNewDraftFromFacade.mockClear().mockResolvedValue(mockState.renderData.initial);
    loadEntityEditorCatalogSuggestionsFromFacade.mockClear().mockImplementation(async readCatalogSuggestions => readCatalogSuggestions());
  });

  it('loads catalog suggestions and renders the shared editor surface in create mode', async () => {
    const { default: EntityNewPage } = await import('./entity-new-page');
    const html = renderToStaticMarkup(<EntityNewPage />);

    expect(html).toContain('data-entity-editor-surface="new"');
    expect(html).toContain('data-cache-key="entity-new:manual:none:none:/entities/catalog-suggestions?limit=120"');
    expect(html).toContain('data-cache-settled-ttl="10000"');
    expect(html).toContain('data-loading-copy="Loading entity draft"');
    expect(html).toContain('checkout-api');

    await mockState.lastLoad?.();

    expect(buildEntityEditorNewDraftFromFacade).toHaveBeenCalledWith(readSeedMonitor, {
      source: null,
      monitorId: null
    });
    expect(loadEntityEditorCatalogSuggestionsFromFacade).toHaveBeenCalledWith(readEntityCatalogSuggestions);
    expect(readEntityCatalogSuggestions).toHaveBeenCalled();
  });

  it('falls back to an empty catalog suggestion payload when the shared catalog endpoint is missing', async () => {
    loadEntityEditorCatalogSuggestionsFromFacade.mockResolvedValueOnce({
      owners: [],
      namespaces: [],
      environments: [],
      systems: [],
      lifecycles: [],
      tiers: [],
      inheritFromRefs: [],
      entityRefs: [],
      languages: [],
      linkProviders: []
    });
    const { default: EntityNewPage } = await import('./entity-new-page');
    renderToStaticMarkup(<EntityNewPage />);

    await expect(mockState.lastLoad?.()).resolves.toEqual({
      initial: mockState.renderData.initial,
      catalogSuggestions: {
        owners: [],
        namespaces: [],
        environments: [],
        systems: [],
        lifecycles: [],
        tiers: [],
        inheritFromRefs: [],
        entityRefs: [],
        languages: [],
        linkProviders: []
      }
    });
  });

  it('passes telemetry handoff query state into the shared new-draft loader', async () => {
    const { default: EntityNewPage } = await import('./entity-new-page');
    const initialSeed = { source: 'telemetry', monitorId: '42' };
    const html = renderToStaticMarkup(<EntityNewPage initialSeed={initialSeed} />);

    expect(html).toContain('data-cache-key="entity-new:/monitor/42:/entities/catalog-suggestions?limit=120"');

    await mockState.lastLoad?.();

    expect(buildEntityEditorNewDraftFromFacade).toHaveBeenCalledWith(readSeedMonitor, {
      source: 'telemetry',
      monitorId: '42'
    });
  });

  it('passes OTLP candidate query state into the shared new-draft loader and cache key', async () => {
    const { default: EntityNewPage } = await import('./entity-new-page');
    const initialSeed = {
      source: 'otlp-candidate',
      monitorId: null,
      identityKey: 'service.name',
      identityValue: 'billing',
      serviceName: 'billing-api',
      serviceNamespace: 'commerce',
      environment: 'prod'
    };
    const html = renderToStaticMarkup(<EntityNewPage initialSeed={initialSeed as any} />);

    expect(html).toContain(
      'data-cache-key="entity-new:otlp-candidate:service.name:billing:billing-api:commerce:prod:/entities/catalog-suggestions?limit=120"'
    );

    await mockState.lastLoad?.();

    expect(buildEntityEditorNewDraftFromFacade).toHaveBeenCalledWith(readSeedMonitor, {
      source: 'otlp-candidate',
      monitorId: null,
      identityKey: 'service.name',
      identityValue: 'billing',
      serviceName: 'billing-api',
      serviceNamespace: 'commerce',
      environment: 'prod'
    });
  });
});
