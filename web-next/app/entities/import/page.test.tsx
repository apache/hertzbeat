import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntityImportPage from './entity-import-page';
import EntityImportRoutePage from './page';
import { createTranslatorMock } from '../../../test/i18n-test-helper';

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    templates: [{ id: '1', name: 'base-template', format: 'yaml', content: 'kind: service' }],
    activities: [{ id: 1, summary: 'bundle previewed', status: 'success', activityType: 'preview' }]
  }
}));

const readImportTemplates = vi.hoisted(() => vi.fn(async () => mockState.renderData.templates));
const readImportActivities = vi.hoisted(() => vi.fn(async () => mockState.renderData.activities));
const loadImportDataFromFacade = vi.hoisted(() => vi.fn(async () => mockState.renderData));

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
    loadingCopy: string;
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

vi.mock('@/components/pages/entity-import-surface', () => ({
  EntityImportSurface: ({ initialMessage, initialMessageTone, routeContext, templates, activities }: any) => (
    <div
      data-entity-import-surface="true"
      data-initial-message={initialMessage ?? ''}
      data-initial-message-tone={initialMessageTone ?? ''}
      data-route-source={routeContext?.source}
      data-route-return-to={routeContext?.returnTo}
      data-route-time-range={routeContext?.timeRange}
    >
      {templates.length} templates / {activities.length} activities
    </div>
  )
}));

vi.mock('@/lib/api-facade', () => ({
  api: {
    entities: {
      importTemplates: readImportTemplates,
      importActivities: readImportActivities
    }
  }
}));

vi.mock('@/lib/entity-import/controller', () => ({
  buildImportActivitiesUrl: () => '/entities/definition-activities?limit=8',
  buildImportTemplatesUrl: () => '/entities/definition/templates?limit=8',
  loadImportDataFromFacade
}));

describe('EntityImportPage', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    readImportTemplates.mockClear().mockResolvedValue(mockState.renderData.templates);
    readImportActivities.mockClear().mockResolvedValue(mockState.renderData.activities);
    loadImportDataFromFacade.mockClear().mockResolvedValue(mockState.renderData);
  });

  it('loads shared import data and renders the shared import surface', async () => {
    const expectedT = createTranslatorMock({ locale: 'zh-CN' });
    const html = renderToStaticMarkup(<EntityImportPage />);

    expect(html).toContain('data-entity-import-surface="true"');
    expect(html).toContain(`data-loading-copy="${expectedT('entities.import.loading')}"`);
    expect(html).toContain(
      'data-cache-key="entity-import:/entities/definition/templates?limit=8:/entities/definition-activities?limit=8"'
    );
    expect(html).toContain('data-cache-settled-ttl="10000"');
    expect(html).toContain('1 templates / 1 activities');

    await mockState.lastLoad?.();

    expect(loadImportDataFromFacade).toHaveBeenCalledWith({
      templates: readImportTemplates,
      activities: readImportActivities
    });
  });

  it('passes route context into the import surface', () => {
    const html = renderToStaticMarkup(
      <EntityImportPage
        routeContext={{
          source: 'product-design-1330',
          returnTo: '/entities?source=product-design-1330&pageSize=50',
          timeRange: 'last-30m'
        }}
      />
    );

    expect(html).toContain('data-route-source="product-design-1330"');
    expect(html).toContain('data-route-return-to="/entities?source=product-design-1330&amp;pageSize=50"');
    expect(html).toContain('data-route-time-range="last-30m"');
  });

  it('reads route context from import route search params', async () => {
    const html = renderToStaticMarkup(
      await EntityImportRoutePage({
        searchParams: Promise.resolve({
          source: 'product-design-1330',
          returnTo: '/entities?source=product-design-1330&pageSize=50',
          timeRange: 'last-30m'
        })
      })
    );

    expect(html).toContain('data-route-source="product-design-1330"');
    expect(html).toContain('data-route-return-to="/entities?source=product-design-1330&amp;pageSize=50"');
    expect(html).toContain('data-route-time-range="last-30m"');
  });

  it('shows delete success feedback when entity detail returns to import', async () => {
    const expectedT = createTranslatorMock({ locale: 'zh-CN' });
    const html = renderToStaticMarkup(
      await EntityImportRoutePage({
        searchParams: Promise.resolve({
          deleteResult: 'success',
          deletedEntity: '658679066385664',
          source: 'product-design-1499'
        })
      })
    );

    expect(html).toContain('data-initial-message-tone="success"');
    expect(html).toContain(expectedT('entities.import.delete-success', { id: '658679066385664' }));
  });
});
