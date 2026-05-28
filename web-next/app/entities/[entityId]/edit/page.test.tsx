import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntityEditPage from './entity-edit-page';
import { createTranslatorMock } from '../../../../test/i18n-test-helper';

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    entityId: '42',
    dto: {
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

const readEntityEditorEntity = vi.hoisted(() => vi.fn(async () => mockState.renderData.dto));
const readEntityCatalogSuggestions = vi.hoisted(() => vi.fn(async () => mockState.renderData.catalogSuggestions));

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
    <div data-entity-editor-surface={mode} data-entity-id={entityId}>
      {initial.entity.name}
    </div>
  )
}));

vi.mock('@/lib/api-facade', () => ({
  api: {
    entities: {
      editorEntity: readEntityEditorEntity,
      catalogSuggestions: readEntityCatalogSuggestions
    }
  }
}));

describe('EntityEditPage', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    readEntityEditorEntity.mockClear().mockResolvedValue(mockState.renderData.dto);
    readEntityCatalogSuggestions.mockClear().mockResolvedValue(mockState.renderData.catalogSuggestions);
  });

  it('loads entity detail plus catalog suggestions and renders the shared editor surface in edit mode', async () => {
    const html = renderToStaticMarkup(<EntityEditPage entityId="42" />);

    expect(html).toContain('data-entity-editor-surface="edit"');
    expect(html).toContain('data-entity-id="42"');
    expect(html).toContain('data-cache-key="entity-edit:/entities/42:/entities/catalog-suggestions?limit=120"');
    expect(html).toContain('data-cache-settled-ttl="10000"');
    expect(html).toContain('data-loading-copy="Loading entity editor"');
    expect(html).toContain('checkout-api');

    await mockState.lastLoad?.();

    expect(readEntityEditorEntity).toHaveBeenCalledWith('42');
    expect(readEntityCatalogSuggestions).toHaveBeenCalledWith(120);
  });

  it('falls back to an empty catalog suggestion payload when the shared catalog endpoint is missing', async () => {
    readEntityCatalogSuggestions.mockRejectedValueOnce(new Error('GET /entities/catalog-suggestions?limit=120 failed with 404'));
    renderToStaticMarkup(<EntityEditPage entityId="42" />);

    await expect(mockState.lastLoad?.()).resolves.toEqual({
      entityId: '42',
      dto: mockState.renderData.dto,
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

  it('falls back to a shared draft entity when the entity detail endpoint is missing', async () => {
    readEntityEditorEntity.mockRejectedValueOnce(new Error('GET /entities/42 failed with 404'));
    renderToStaticMarkup(<EntityEditPage entityId="42" />);

    await expect(mockState.lastLoad?.()).resolves.toEqual({
      entityId: '42',
      dto: {
        entity: {
          id: 42,
          type: 'service',
          name: 'entity-42',
          displayName: 'Entity 42',
          owner: 'platform',
          system: 'catalog',
          environment: 'prod',
          lifecycle: 'production',
          source: 'manual',
          labels: {},
          tags: [],
          additionalOwners: [],
          links: [],
          contacts: [],
          componentOf: [],
          components: [],
          implementedBy: [],
          languages: []
        },
        identities: [],
        monitorBinds: [],
        relations: []
      },
      catalogSuggestions: mockState.renderData.catalogSuggestions
    });
  });
});
