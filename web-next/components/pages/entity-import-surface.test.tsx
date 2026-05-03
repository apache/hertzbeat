import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./entity-definition-workspace-surface', () => ({
  EntityDefinitionWorkspaceSurface: ({ mode, templates, activities }: any) => (
    <div data-entity-definition-workspace={mode}>
      {templates.length} templates / {activities.length} activities
    </div>
  )
}));

describe('EntityImportSurface', () => {
  it('forwards import mode into the shared definition workspace surface', async () => {
    const { EntityImportSurface } = await import('./entity-import-surface');

    const html = renderToStaticMarkup(
      <EntityImportSurface
        templates={[{ id: '1', name: 'base-template', format: 'yaml', content: 'kind: service' } as any]}
        activities={[{ id: 1, summary: 'bundle previewed', status: 'success', activityType: 'preview' } as any]}
      />
    );

    expect(html).toContain('data-entity-definition-workspace="import"');
    expect(html).toContain('1 templates / 1 activities');
  });
});
