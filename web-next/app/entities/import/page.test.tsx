import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntityImportPage from './entity-import-page';
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
  EntityImportSurface: ({ templates, activities }: any) => (
    <div data-entity-import-surface="true">
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
});
