import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntityDiscoveryPage from './entity-discovery-page';
import { createTranslatorMock } from '../../../test/i18n-test-helper';

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    presets: [{ id: '1', name: 'default-preset' }],
    activities: [{ id: '2', summary: 'preset synced' }],
    catalog: { owners: ['platform'] }
  }
}));

const readDiscoveryPresets = vi.hoisted(() => vi.fn(async () => mockState.renderData.presets));
const readDiscoveryActivities = vi.hoisted(() => vi.fn(async () => mockState.renderData.activities));
const readCatalogSuggestions = vi.hoisted(() => vi.fn(async () => mockState.renderData.catalog));
const loadDiscoveryDataFromFacade = vi.hoisted(() => vi.fn(async () => mockState.renderData));

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({
      locale: 'zh-CN'
    })
  })
}));

const expectedT = createTranslatorMock({ locale: 'zh-CN' });

vi.mock('next/navigation', () => ({
  useSearchParams: () =>
    new URLSearchParams(
      'search=Codex%20PD%201315&pageIndex=1&identityKey=service.name&identityValue=billing&serviceName=billing-api&serviceNamespace=commerce&environment=prod&source=product-design-1335'
    )
}));

vi.mock('@/components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load,
    loadingCopy,
    cacheKey,
    cacheSettledTtlMs
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
    loadingCopy?: string;
    cacheKey?: string;
    cacheSettledTtlMs?: number;
  }) => {
    mockState.lastLoad = load;
    return (
      <div
        data-client-workbench="true"
        data-loading-copy={loadingCopy}
        data-cache-key={cacheKey}
        data-cache-settled-ttl={cacheSettledTtlMs}
      >
        {children(mockState.renderData)}
      </div>
    );
  }
}));

vi.mock('@/components/pages/entity-discovery-surface', () => ({
  EntityDiscoverySurface: ({ presets, activities, catalog, candidateContext, initialSearch, initialSource, initialPageIndex, deleteSuccess, deletedEntity }: any) => (
    <div
      data-entity-discovery-surface="otlp-hertzbeat-ui-discovery-console"
      data-page-initial-search={initialSearch}
      data-page-initial-source={initialSource}
      data-page-initial-page-index={initialPageIndex}
      data-page-delete-success={deleteSuccess ? 'true' : 'false'}
      data-page-deleted-entity={deletedEntity ?? ''}
    >
      {candidateContext ? (
        <span
          data-page-candidate-source={candidateContext.source}
          data-page-candidate-identity={`${candidateContext.identityKey}:${candidateContext.identityValue}`}
          data-page-candidate-service={candidateContext.serviceName}
          data-page-candidate-namespace={candidateContext.serviceNamespace}
          data-page-candidate-environment={candidateContext.environment}
        />
      ) : null}
      {presets.length} presets / {activities.length} activities / {catalog.owners.length} owners
    </div>
  )
}));

vi.mock('@/lib/api-facade', () => ({
  api: {
    entities: {
      discoveryGovernancePresets: readDiscoveryPresets,
      discoveryGovernanceActivities: readDiscoveryActivities,
      catalogSuggestions: readCatalogSuggestions
    }
  }
}));

vi.mock('@/lib/entity-discovery/controller', () => ({
  buildDiscoveryCatalogSuggestionsUrl: () => '/entities/catalog-suggestions?limit=120',
  buildDiscoveryGovernanceActivitiesUrl: () => '/entities/discovery/governance-activities?limit=8',
  buildDiscoveryGovernancePresetsUrl: () => '/entities/discovery/governance-presets?limit=8',
  loadDiscoveryDataFromFacade
}));

describe('EntityDiscoveryPage', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    readDiscoveryPresets.mockClear().mockResolvedValue(mockState.renderData.presets);
    readDiscoveryActivities.mockClear().mockResolvedValue(mockState.renderData.activities);
    readCatalogSuggestions.mockClear().mockResolvedValue(mockState.renderData.catalog);
    loadDiscoveryDataFromFacade.mockClear().mockResolvedValue(mockState.renderData);
  });

  it('loads discovery workspace data and renders the shared discovery surface', async () => {
    const html = renderToStaticMarkup(<EntityDiscoveryPage />);

    expect(html).toContain('data-entity-discovery-surface="otlp-hertzbeat-ui-discovery-console"');
    expect(html).toContain(`data-loading-copy="${expectedT('entities.discovery.loading')}"`);
    expect(html).toContain(
      'data-cache-key="entity-discovery:/entities/discovery/governance-presets?limit=8:/entities/discovery/governance-activities?limit=8:/entities/catalog-suggestions?limit=120"'
    );
    expect(html).toContain('data-cache-settled-ttl="10000"');
    expect(html).toContain('1 presets / 1 activities / 1 owners');
    expect(html).toContain('data-page-candidate-source="otlp-candidate"');
    expect(html).toContain('data-page-candidate-identity="service.name:billing"');
    expect(html).toContain('data-page-candidate-service="billing-api"');
    expect(html).toContain('data-page-candidate-namespace="commerce"');
    expect(html).toContain('data-page-candidate-environment="prod"');
    expect(html).toContain('data-page-initial-search="Codex PD 1315"');
    expect(html).toContain('data-page-initial-source="product-design-1335"');
    expect(html).toContain('data-page-delete-success="false"');
    expect(html).toContain('data-page-initial-page-index="1"');

    await mockState.lastLoad?.();

    expect(loadDiscoveryDataFromFacade).toHaveBeenCalledWith({
      presets: readDiscoveryPresets,
      activities: readDiscoveryActivities,
      catalogSuggestions: readCatalogSuggestions
    });
  });
});
