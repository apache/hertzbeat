import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('alert center cold-workbench chrome', () => {
  it('removes the remaining route-local hsl and oversized alert chrome from the cold-matte center slice', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-center-surface.tsx'), 'utf8');

    expect(source).not.toContain('hsl(var(--');
    expect(source).not.toContain('rounded-[20px]');
    expect(source).not.toContain('rounded-[16px]');
    expect(source).not.toContain('rounded-[14px]');
    expect(source).not.toContain('rounded-[12px]');
  });

  it('adopts the OTLP cold visual owner instead of the old alert-surface primitive owners', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-center-surface.tsx'), 'utf8');
    const searchRowSource = readFileSync(resolve(process.cwd(), 'components/ui/search-row.tsx'), 'utf8');

    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).toContain('data-alert-center-surface="otlp-cold-center-console"');
    expect(source).toContain('data-alert-center-style-baseline={coldCenterVisual.canvasName}');
    expect(source).toContain('data-alert-center-header="cold-compact-header"');
    expect(source).toContain('data-alert-center-command-row="standard-equal-buttons"');
    expect(source).toContain('data-alert-center-admin-layout="full-width-admin-list"');
    expect(source).toContain('data-alert-center-toolbar="cold-query-toolbar"');
    expect(source).toContain('data-alert-center-query-toolbar="single-query-form"');
    expect(source).toContain('data-alert-center-query-filters="inline-before-submit"');
    expect(searchRowSource).toContain('data-cold-search-filter-slot="inline-before-submit"');
    expect(source).not.toContain('data-alert-center-refresh-slot');
    expect(source).not.toContain('data-alert-center-empty-action');
    expect(source).toContain('data-alert-center-list-shell="cold-alert-list"');
    expect(source).toContain('rounded-[4px]');
    expect(source).toContain('rounded-[3px]');
    expect(source).not.toContain('data-alert-center-summary-rail');
    expect(source).not.toContain('coldCenterVisual.layout.heroGrid');
    expect(source).not.toContain('coldCenterVisual.layout.railGrid');
    expect(source).not.toContain('coldCenterVisual.signal.band');
    expect(source).not.toContain('coldCenterVisual.panel.rail');

    expect(source).not.toContain("from './alert-surface-primitives'");
    expect(source).not.toContain("from './alert-authoring-primitives'");
    expect(source).not.toContain('AlertSurfaceActionLink');
    expect(source).not.toContain('AlertSurfaceActionButton');
    expect(source).not.toContain('AlertSurfaceValuePill');
    expect(source).not.toContain('alertAuthoringSelectClassName');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('ToolbarRow');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('RailSection');
    expect(source).not.toContain('angular-single-panel');
    expect(source).not.toContain('angular-density');
  });

  it('keeps the compatibility /alert/center entry as a redirect into the cold /alert owner', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/center/page.tsx'), 'utf8');

    expect(source).toContain('buildAlertCompatRouteUrl(createCompatSearchParamReader(resolvedSearchParams))');
    expect(source).toContain("from '../../../lib/alert-manage/query-state'");
    expect(source).toContain("from '../../../lib/compat/search-params'");
    expect(source).not.toContain('AlertCenterSurface');
    expect(source).not.toContain('WorkbenchPage');
  });
});
