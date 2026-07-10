import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('entity editor family cold-workbench chrome', () => {
  it('removes the remaining legacy white-on-black chrome from the shared editor slice', () => {
    const editorRowsSource = readFileSync(resolve(process.cwd(), 'components/observability/editor-rows.tsx'), 'utf8');
    const monitorEditorSource = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');
    const entityEditorSource = readFileSync(resolve(process.cwd(), 'components/pages/entity-editor-surface.tsx'), 'utf8');
    const entitiesSource = readFileSync(resolve(process.cwd(), 'app/entities/entity-list-page.tsx'), 'utf8');

    expect(editorRowsSource).not.toContain('border-white/10');
    expect(editorRowsSource).not.toContain('bg-black/20');
    expect(editorRowsSource).not.toContain('text-white/70');
    expect(editorRowsSource).not.toContain('border-white/8');
    expect(editorRowsSource).not.toContain('bg-white/[0.025]');

    expect(monitorEditorSource).not.toContain('border-white/10');
    expect(monitorEditorSource).not.toContain('bg-black/20');
    expect(monitorEditorSource).not.toContain('text-white/80');
    expect(monitorEditorSource).not.toContain('text-white/60');
    expect(monitorEditorSource).not.toContain('text-white/30');
    expect(monitorEditorSource).not.toContain('focus:border-sky-400/35');

    expect(entityEditorSource).not.toContain('border-white/10');
    expect(entityEditorSource).not.toContain('border-white/8');
    expect(entityEditorSource).not.toContain('bg-black/20');
    expect(entityEditorSource).not.toContain('bg-white/[0.025]');
    expect(entityEditorSource).not.toContain('text-white/72');
    expect(entityEditorSource).not.toContain('text-white/62');
    expect(entityEditorSource).not.toContain('text-white/55');
    expect(entityEditorSource).not.toContain('text-white');
    expect(entityEditorSource).not.toContain('bg-white');
    expect(entityEditorSource).not.toContain('rounded-[2px]');
    expect(entityEditorSource).not.toContain('useAngularVisual');
    expect(entityEditorSource).not.toContain('angular-');
    expect(entityEditorSource).not.toContain('WorkbenchPage');
    expect(entityEditorSource).not.toContain('SurfaceSection');
    expect(entityEditorSource).not.toContain('RailSection');
    expect(entityEditorSource).not.toContain('WorkbenchPillButton');
    expect(entityEditorSource).not.toContain('WorkbenchSelectableCard');
    expect(entityEditorSource).not.toContain('WorkbenchStack');
    expect(entityEditorSource).not.toContain('RowList');
    expect(entityEditorSource).not.toContain('buildEntityEditorFacts');
    expect(entityEditorSource).not.toContain('buildEntityEditorCatalogRows');
    expect(entityEditorSource).not.toContain('buildEntityEditorNextStepRows');
    expect(entityEditorSource).not.toContain('buildEntityEditorWorkspaceTabs');
    expect(entityEditorSource).not.toContain("'Workflow'");
    expect(entityEditorSource).not.toContain("'Basics'");
    expect(entityEditorSource).not.toContain('focus:border-sky-400/35');
    expect(entityEditorSource).not.toContain('border-sky-400/40');
    expect(entityEditorSource).not.toContain('bg-sky-400/12');
    expect(entityEditorSource).not.toContain('lightInputClassName');
    expect(entityEditorSource).not.toContain('nameInputClassName');
  });

  it('adopts shared ops tokens across the shared editor slice', () => {
    const editorRowsSource = readFileSync(resolve(process.cwd(), 'components/observability/editor-rows.tsx'), 'utf8');
    const workbenchPrimitivesSource = readFileSync(resolve(process.cwd(), 'components/workbench/primitives.tsx'), 'utf8');
    const workbenchPageSource = readFileSync(resolve(process.cwd(), 'components/workbench/workbench-page.tsx'), 'utf8');
    const monitorEditorSource = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');
    const entityEditorSource = readFileSync(resolve(process.cwd(), 'components/pages/entity-editor-surface.tsx'), 'utf8');
    const entitiesSource = readFileSync(resolve(process.cwd(), 'app/entities/entity-list-page.tsx'), 'utf8');

    expect(editorRowsSource).toContain('border-[var(--ops-border-color)]');
    expect(editorRowsSource).toContain('bg-[var(--ops-surface-panel)]');
    expect(editorRowsSource).toContain('text-[var(--ops-text-primary)]');
    expect(editorRowsSource).toContain('text-[var(--ops-text-secondary)]');
    expect(editorRowsSource).toContain('hover:bg-[var(--ops-surface-hover)]');

    expect(monitorEditorSource).toContain('HzMonitorEditorForm');
    expect(monitorEditorSource).toContain('HzMonitorEditorHeader');
    expect(monitorEditorSource).toContain('HzMonitorEditorSection');
    expect(monitorEditorSource).toContain('data-monitor-editor-form-owner="hertzbeat-ui-monitor-editor-form"');
    expect(monitorEditorSource).not.toContain('WorkbenchPage');
    expect(monitorEditorSource).not.toContain('SurfaceSection');
    expect(workbenchPrimitivesSource).toContain('border-[var(--ops-border-color)]');
    expect(workbenchPrimitivesSource).toContain('bg-[var(--ops-surface-panel)]');
    expect(workbenchPrimitivesSource).toContain('text-[var(--ops-text-primary)]');
    expect(workbenchPrimitivesSource).toContain('text-[var(--ops-text-secondary)]');
    expect(workbenchPageSource).toContain('divide-[var(--ops-border-color)]');
    expect(workbenchPageSource).toContain('text-[var(--ops-text-primary)]');
    expect(workbenchPageSource).toContain('text-[var(--ops-text-secondary)]');

    expect(entityEditorSource).toContain('data-entity-editor-shell="otlp-hertzbeat-ui-entity-composer"');
    expect(entityEditorSource).toContain('data-entity-editor-style-baseline="hertzbeat-ui-matte"');
    expect(entityEditorSource).toContain('data-entity-editor-frame="hertzbeat-ui-unframed-editor-band"');
    expect(entityEditorSource).toContain('data-entity-editor-nested-card-policy="no-card-inside-card"');
    expect(entityEditorSource).toContain('data-entity-editor-summary-card="hertzbeat-ui-unframed-editor-section"');
    expect(entityEditorSource).toContain('data-entity-editor-definition-footer="hertzbeat-ui-definition-footer"');
    expect(entityEditorSource).toContain('data-entity-editor-definition-tabs="hertzbeat-ui-bottom-tabs"');

    expect(entitiesSource).toContain('EntityListSurface');
    expect(entitiesSource).not.toContain('SummaryMetricGrid');
    expect(entitiesSource).not.toContain('StageSection');
    expect(entitiesSource).not.toContain('DrawerSection');
    expect(entitiesSource).not.toContain('DrawerCodePreview');
    expect(entitiesSource).not.toContain('ObservabilityStatusState');
  });

  it('keeps the active monitor/entity edit routes composed from the shared editor owners', () => {
    const monitorEditRouteSource = readFileSync(resolve(process.cwd(), 'app/monitors/[monitorId]/edit/page.tsx'), 'utf8');
    const monitorEditSource = readFileSync(resolve(process.cwd(), 'app/monitors/[monitorId]/edit/monitor-edit-page.tsx'), 'utf8');
    const entityNewRouteSource = readFileSync(resolve(process.cwd(), 'app/entities/new/page.tsx'), 'utf8');
    const entityNewSource = readFileSync(resolve(process.cwd(), 'app/entities/new/entity-new-page.tsx'), 'utf8');
    const entityEditRouteSource = readFileSync(resolve(process.cwd(), 'app/entities/[entityId]/edit/page.tsx'), 'utf8');
    const entityEditSource = readFileSync(resolve(process.cwd(), 'app/entities/[entityId]/edit/entity-edit-page.tsx'), 'utf8');

    expect(monitorEditRouteSource).toContain("import MonitorEditPage from './monitor-edit-page'");
    expect(monitorEditSource).toContain('MonitorEditorSurface');
    expect(entityNewRouteSource).toContain("import EntityNewPage from './entity-new-page'");
    expect(entityNewSource).toContain('EntityEditorSurface');
    expect(entityEditRouteSource).toContain("import EntityEditPage from './entity-edit-page'");
    expect(entityEditSource).toContain('EntityEditorSurface');
  });
});
