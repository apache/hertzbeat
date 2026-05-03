import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntityEditPage from './page';
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

const apiMessageGet = vi.hoisted(() =>
  vi.fn((path: string) => {
    if (path === '/entities/42') {
      return Promise.resolve(mockState.renderData.dto);
    }
    if (path === '/entities/catalog-suggestions?limit=120') {
      return Promise.resolve(mockState.renderData.catalogSuggestions);
    }
    return Promise.reject(new Error(`unexpected path: ${path}`));
  })
);

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock()
  })
}));

vi.mock('@/components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
  }) => {
    mockState.lastLoad = load;
    return <div data-client-workbench="true">{children(mockState.renderData)}</div>;
  }
}));

vi.mock('@/components/pages/entity-editor-surface', () => ({
  EntityEditorSurface: ({ mode, entityId, initial }: any) => (
    <div data-entity-editor-surface={mode} data-entity-id={entityId}>
      {initial.entity.name}
    </div>
  )
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageGet
}));

describe('EntityEditPage', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    apiMessageGet.mockClear();
  });

  it('loads entity detail plus catalog suggestions and renders the shared editor surface in edit mode', async () => {
    const html = renderToStaticMarkup(<EntityEditPage params={Promise.resolve({ entityId: '42' })} />);

    expect(html).toContain('data-entity-editor-surface="edit"');
    expect(html).toContain('data-entity-id="42"');
    expect(html).toContain('checkout-api');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenCalledWith('/entities/42');
    expect(apiMessageGet).toHaveBeenCalledWith('/entities/catalog-suggestions?limit=120');
  });

  it('falls back to an empty catalog suggestion payload when the shared catalog endpoint is missing', async () => {
    apiMessageGet.mockImplementation((path: string) => {
      if (path === '/entities/42') {
        return Promise.resolve(mockState.renderData.dto);
      }
      if (path === '/entities/catalog-suggestions?limit=120') {
        return Promise.reject(new Error('GET /entities/catalog-suggestions?limit=120 failed with 404'));
      }
      return Promise.reject(new Error(`unexpected path: ${path}`));
    });
    renderToStaticMarkup(<EntityEditPage params={Promise.resolve({ entityId: '42' })} />);

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
    apiMessageGet.mockImplementation((path: string) => {
      if (path === '/entities/42') {
        return Promise.reject(new Error('GET /entities/42 failed with 404'));
      }
      if (path === '/entities/catalog-suggestions?limit=120') {
        return Promise.resolve(mockState.renderData.catalogSuggestions);
      }
      return Promise.reject(new Error(`unexpected path: ${path}`));
    });
    renderToStaticMarkup(<EntityEditPage params={Promise.resolve({ entityId: '42' })} />);

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
