import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntityEditPage, { buildEntityEditorListReturnHref } from './entity-edit-page';
import { createTranslatorMock } from '../../../../test/i18n-test-helper';

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  renderError: false,
  push: vi.fn(),
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

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockState.push
  })
}));

vi.mock('@hertzbeat/ui', () => ({
  HzButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  HzInlineFeedback: ({ title, description, ...props }: any) => (
    <section data-hz-ui="inline-feedback" {...props}>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  )
}));

vi.mock('@/components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load,
    cacheKey,
    cacheSettledTtlMs,
    loadingCopy,
    renderError
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
    cacheKey?: string;
    cacheSettledTtlMs?: number;
    loadingCopy?: string;
    renderError?: (message: string, retry: () => void) => React.ReactNode;
  }) => {
    mockState.lastLoad = load;
    if (mockState.renderError) {
      return <div data-client-workbench="error">{renderError?.('Entity not exist.', () => undefined)}</div>;
    }
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
  EntityEditorSurface: ({ mode, entityId, initial, routeContext }: any) => (
    <div data-entity-editor-surface={mode} data-entity-id={entityId} data-route-monitor-id={routeContext?.monitorId ?? ''}>
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
    mockState.renderError = false;
    mockState.push.mockReset();
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

  it('passes inherited monitor context into the shared editor surface', () => {
    const html = renderToStaticMarkup(
      <EntityEditPage
        entityId="42"
        routeContext={{
          monitorId: '658094606003456',
          monitorName: 'Checkout API',
          monitorApp: 'website',
          monitorInstance: '127.0.0.1:4223',
          source: 'discovery-candidate'
        }}
      />
    );

    expect(html).toContain('data-entity-editor-surface="edit"');
    expect(html).toContain('data-route-monitor-id="658094606003456"');
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

  it('returns missing editor route states to the inherited entity list context', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/entities/[entityId]/edit/entity-edit-page.tsx'), 'utf8');

    expect(buildEntityEditorListReturnHref({ returnTo: '/entities?search=checkout&source=pd-1218&pageSize=8' })).toBe(
      '/entities?search=checkout&source=pd-1218&pageSize=8'
    );
    expect(buildEntityEditorListReturnHref({ returnTo: 'https://example.invalid/entities', source: 'pd-1218', pageSize: '8' })).toBe(
      '/entities?pageSize=8&source=pd-1218'
    );
    expect(source).toContain('data-entity-editor-route-state-list-return="true"');
    expect(source).toContain('data-entity-editor-route-state-list-return-target={listReturnHref}');
    expect(source).toContain("renderError={(message, retry) => (");
  });

  it('renders retry and entity-list recovery actions for missing edit loads', () => {
    mockState.renderError = true;

    const html = renderToStaticMarkup(
      <EntityEditPage
        entityId="1"
        routeContext={{
          returnTo: '/entities?search=checkout&source=pd-1218&pageSize=8'
        }}
      />
    );

    expect(html).toContain('data-entity-editor-route-state="error"');
    expect(html).toContain('data-entity-editor-edit-error-state="missing-entity"');
    expect(html).toContain('data-entity-editor-route-state-retry="true"');
    expect(html).toContain('data-entity-editor-route-state-list-return="true"');
    expect(html).toContain('data-entity-editor-route-state-list-return-target="/entities?search=checkout&amp;source=pd-1218&amp;pageSize=8"');
    expect(html).toContain('Entity not exist.');
  });
});
