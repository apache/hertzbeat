import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntityDiscoveryPage from './page';

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    presets: [{ id: '1', name: 'default-preset' }],
    activities: [{ id: '2', summary: 'preset synced' }],
    catalog: { owners: ['platform'] }
  }
}));

const loadDiscoveryData = vi.hoisted(() => vi.fn(async () => mockState.renderData));
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

vi.mock('@/components/pages/entity-discovery-surface', () => ({
  EntityDiscoverySurface: ({ presets, activities, catalog }: any) => (
    <div data-entity-discovery-surface="otlp-cold-discovery-console">
      {presets.length} presets / {activities.length} activities / {catalog.owners.length} owners
    </div>
  )
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageGet
}));

vi.mock('@/lib/entity-discovery/controller', () => ({
  loadDiscoveryData
}));

describe('EntityDiscoveryPage', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    loadDiscoveryData.mockClear().mockResolvedValue(mockState.renderData);
    apiMessageGet.mockClear();
  });

  it('loads discovery workspace data and renders the shared discovery surface', async () => {
    const html = renderToStaticMarkup(<EntityDiscoveryPage />);

    expect(html).toContain('data-entity-discovery-surface="otlp-cold-discovery-console"');
    expect(html).toContain('data-loading-copy="遥测发现"');
    expect(html).toContain('1 presets / 1 activities / 1 owners');

    await mockState.lastLoad?.();

    expect(loadDiscoveryData).toHaveBeenCalledWith(apiMessageGet);
  });
});
