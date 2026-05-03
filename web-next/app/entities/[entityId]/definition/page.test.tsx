import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntityDefinitionPage from './page';

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    entityId: '42',
    definition: 'kind: service',
    templates: [{ id: '1', name: 'base-template', format: 'yaml', content: 'kind: service' }],
    activities: [{ id: 1, summary: 'definition updated', status: 'success', activityType: 'update' }]
  }
}));

const loadEntityDefinitionPageData = vi.hoisted(() => vi.fn(async () => mockState.renderData));
const apiMessageGet = vi.hoisted(() => vi.fn());

vi.mock('@/components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load,
    loadingCopy
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
    loadingCopy?: string;
  }) => {
    mockState.lastLoad = load;
    return (
      <div data-client-workbench="true" data-loading-copy={loadingCopy}>
        {children(mockState.renderData)}
      </div>
    );
  }
}));

vi.mock('@/components/pages/entity-definition-workspace-surface', () => ({
  EntityDefinitionWorkspaceSurface: ({ mode, entityId, initialContent, initialMessage, templates, activities }: any) => (
    <div data-entity-definition-workspace={mode} data-entity-id={entityId}>
      {initialContent} / {templates.length} templates / {activities.length} activities
      {initialMessage ? ` / ${initialMessage}` : ''}
    </div>
  )
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageGet
}));

vi.mock('@/lib/entity-definition/controller', () => ({
  loadEntityDefinitionPageData
}));

describe('EntityDefinitionPage', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    loadEntityDefinitionPageData.mockClear().mockResolvedValue(mockState.renderData);
    apiMessageGet.mockClear();
  });

  it('loads definition workspace data and renders the shared definition workspace surface', async () => {
    const html = renderToStaticMarkup(<EntityDefinitionPage params={Promise.resolve({ entityId: '42' })} />);

    expect(html).toContain('data-entity-definition-workspace="definition"');
    expect(html).toContain('data-loading-copy="编辑实体定义"');
    expect(html).toContain('kind: service / 1 templates / 1 activities');

    await mockState.lastLoad?.();

    expect(loadEntityDefinitionPageData).toHaveBeenCalledWith(apiMessageGet, '42', 'yaml');
  });

  it('forwards recoverable load messages into the definition surface for empty-error parity', () => {
    mockState.renderData = {
      entityId: '1',
      definition: '',
      loadMessage: 'Entity not exist.',
      templates: [],
      activities: []
    } as any;

    const html = renderToStaticMarkup(<EntityDefinitionPage params={Promise.resolve({ entityId: '1' })} />);

    expect(html).toContain('data-entity-definition-workspace="definition"');
    expect(html).toContain('Entity not exist.');
  });
});
