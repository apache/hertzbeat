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

vi.mock('next/navigation', () => ({
  useSearchParams: () =>
    new URLSearchParams(
      'identityKey=service.name&identityValue=billing&serviceName=billing-api&serviceNamespace=commerce&environment=prod'
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
  EntityDiscoverySurface: ({ presets, activities, catalog, candidateContext }: any) => (
    <div data-entity-discovery-surface="otlp-cold-discovery-console">
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

    expect(html).toContain('data-entity-discovery-surface="otlp-cold-discovery-console"');
    expect(html).toContain('data-loading-copy="遥测发现"');
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

    await mockState.lastLoad?.();

    expect(loadDiscoveryDataFromFacade).toHaveBeenCalledWith({
      presets: readDiscoveryPresets,
      activities: readDiscoveryActivities,
      catalogSuggestions: readCatalogSuggestions
    });
  });
});
