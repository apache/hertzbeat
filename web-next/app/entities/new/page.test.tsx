import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';

const mockState = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
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

const apiMessageGet = vi.hoisted(() => vi.fn(async () => mockState.renderData.catalogSuggestions));
const loadEntityEditorNewDraft = vi.hoisted(() => vi.fn(async () => mockState.renderData.initial));
const loadEntityEditorCatalogSuggestions = vi.hoisted(() => vi.fn(async () => mockState.renderData.catalogSuggestions));

vi.mock('next/navigation', () => ({
  useSearchParams: () =>
    ({
      get: (key: string) => mockState.searchParams.get(key)
    }) as { get(name: string): string | null }
}));

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
    <div data-entity-editor-surface={mode} data-entity-id={entityId ?? 'new'}>
      {initial.entity.name}
    </div>
  )
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageGet
}));

vi.mock('@/lib/entity-editor/controller', () => ({
  buildEntityEditorNewDraft: loadEntityEditorNewDraft,
  loadEntityEditorCatalogSuggestions
}));

describe('EntityNewPage', () => {
  beforeEach(() => {
    mockState.searchParams = new URLSearchParams();
    mockState.lastLoad = null;
    apiMessageGet.mockClear().mockResolvedValue(mockState.renderData.catalogSuggestions);
    loadEntityEditorNewDraft.mockClear().mockResolvedValue(mockState.renderData.initial);
    loadEntityEditorCatalogSuggestions.mockClear().mockResolvedValue(mockState.renderData.catalogSuggestions);
  });

  it('loads catalog suggestions and renders the shared editor surface in create mode', async () => {
    const { default: EntityNewPage } = await import('./page');
    const html = renderToStaticMarkup(<EntityNewPage />);

    expect(html).toContain('data-entity-editor-surface="new"');
    expect(html).toContain('checkout-api');

    await mockState.lastLoad?.();

    expect(loadEntityEditorNewDraft).toHaveBeenCalledWith(expect.any(Function), {
      source: null,
      monitorId: null
    });
    expect(loadEntityEditorCatalogSuggestions).toHaveBeenCalledWith(expect.any(Function));
  });

  it('falls back to an empty catalog suggestion payload when the shared catalog endpoint is missing', async () => {
    loadEntityEditorCatalogSuggestions.mockResolvedValueOnce({
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
    const { default: EntityNewPage } = await import('./page');
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
    mockState.searchParams = new URLSearchParams('source=telemetry&monitorId=42');

    const { default: EntityNewPage } = await import('./page');
    renderToStaticMarkup(<EntityNewPage />);

    await mockState.lastLoad?.();

    expect(loadEntityEditorNewDraft).toHaveBeenCalledWith(expect.any(Function), {
      source: 'telemetry',
      monitorId: '42'
    });
  });
});
