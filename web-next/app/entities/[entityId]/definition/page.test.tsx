import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntityDefinitionPage from './entity-definition-page';
import { createTranslatorMock } from '../../../../test/i18n-test-helper';

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    entityId: '42',
    definition: 'kind: service',
    templates: [{ id: '1', name: 'base-template', format: 'yaml', content: 'kind: service' }],
    activities: [{ id: 1, summary: 'definition updated', status: 'success', activityType: 'update' }]
  }
}));

const readEntityDefinition = vi.hoisted(() => vi.fn(async () => mockState.renderData.definition));
const readEntityDefinitionActivities = vi.hoisted(() => vi.fn(async () => mockState.renderData.activities));
const readEntityDefinitionTemplates = vi.hoisted(() => vi.fn(async () => mockState.renderData.templates));
const loadEntityDefinitionPageDataFromFacade = vi.hoisted(() => vi.fn(async () => mockState.renderData));

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({
      locale: 'zh-CN'
    })
  })
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

vi.mock('@/components/pages/entity-definition-workspace-surface', () => ({
  EntityDefinitionWorkspaceSurface: ({ mode, entityId, initialContent, initialMessage, templates, activities }: any) => (
    <div data-entity-definition-workspace={mode} data-entity-id={entityId}>
      {initialContent} / {templates.length} templates / {activities.length} activities
      {initialMessage ? ` / ${initialMessage}` : ''}
    </div>
  )
}));

vi.mock('@/lib/api-facade', () => ({
  api: {
    entities: {
      definition: readEntityDefinition,
      definitionActivities: readEntityDefinitionActivities,
      definitionTemplates: readEntityDefinitionTemplates
    }
  }
}));

vi.mock('@/lib/entity-definition/controller', () => ({
  buildEntityDefinitionActivitiesUrl: (entityId: string) => `/entities/definition-activities?entityId=${entityId}&limit=8`,
  buildEntityDefinitionTemplatesUrl: () => '/entities/definition/templates?limit=8',
  buildEntityDefinitionUrl: (entityId: string, format: string) => `/entities/${entityId}/definition?format=${format}`,
  loadEntityDefinitionPageDataFromFacade
}));

describe('EntityDefinitionPage', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    readEntityDefinition.mockClear().mockResolvedValue(mockState.renderData.definition);
    readEntityDefinitionActivities.mockClear().mockResolvedValue(mockState.renderData.activities);
    readEntityDefinitionTemplates.mockClear().mockResolvedValue(mockState.renderData.templates);
    loadEntityDefinitionPageDataFromFacade.mockClear().mockResolvedValue(mockState.renderData);
  });

  it('loads definition workspace data and renders the shared definition workspace surface', async () => {
    const html = renderToStaticMarkup(<EntityDefinitionPage entityId="42" />);

    expect(html).toContain('data-entity-definition-workspace="definition"');
    expect(html).toContain('data-loading-copy="编辑实体定义"');
    expect(html).toContain(
      'data-cache-key="entity-definition:/entities/42/definition?format=yaml:/entities/definition-activities?entityId=42&amp;limit=8:/entities/definition/templates?limit=8"'
    );
    expect(html).toContain('data-cache-settled-ttl="10000"');
    expect(html).toContain('kind: service / 1 templates / 1 activities');

    await mockState.lastLoad?.();

    expect(loadEntityDefinitionPageDataFromFacade).toHaveBeenCalledWith(
      {
        definition: readEntityDefinition,
        activities: readEntityDefinitionActivities,
        templates: readEntityDefinitionTemplates
      },
      '42',
      'yaml'
    );
  });

  it('forwards recoverable load messages into the definition surface for empty-error parity', () => {
    mockState.renderData = {
      entityId: '1',
      definition: '',
      loadMessage: 'Entity not exist.',
      templates: [],
      activities: []
    } as any;

    const html = renderToStaticMarkup(<EntityDefinitionPage entityId="1" />);

    expect(html).toContain('data-entity-definition-workspace="definition"');
    expect(html).toContain('Entity not exist.');
  });
});
