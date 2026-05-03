import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntityImportPage from './page';

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    templates: [{ id: '1', name: 'base-template', format: 'yaml', content: 'kind: service' }],
    activities: [{ id: 1, summary: 'bundle previewed', status: 'success', activityType: 'preview' }]
  }
}));

const loadImportData = vi.hoisted(() => vi.fn(async () => mockState.renderData));

vi.mock('@/components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load,
    loadingCopy
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
    loadingCopy: string;
  }) => {
    mockState.lastLoad = load;
    return <div data-client-workbench="true" data-loading-copy={loadingCopy}>{children(mockState.renderData)}</div>;
  }
}));

vi.mock('@/components/pages/entity-import-surface', () => ({
  EntityImportSurface: ({ templates, activities }: any) => (
    <div data-entity-import-surface="true">
      {templates.length} templates / {activities.length} activities
    </div>
  )
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageGet: vi.fn()
}));

vi.mock('@/lib/entity-import/controller', () => ({
  loadImportData
}));

describe('EntityImportPage', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    loadImportData.mockClear().mockResolvedValue(mockState.renderData);
  });

  it('loads shared import data and renders the shared import surface', async () => {
    const html = renderToStaticMarkup(<EntityImportPage />);

    expect(html).toContain('data-entity-import-surface="true"');
    expect(html).toContain('data-loading-copy="导入实体定义"');
    expect(html).toContain('1 templates / 1 activities');

    await mockState.lastLoad?.();

    expect(loadImportData).toHaveBeenCalledTimes(1);
  });
});
