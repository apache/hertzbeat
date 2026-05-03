import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('entity editor family cold-workbench chrome', () => {
  it('removes the remaining legacy white-on-black chrome from the shared editor slice', () => {
    const editorRowsSource = readFileSync(resolve(process.cwd(), 'components/observability/editor-rows.tsx'), 'utf8');
    const monitorEditorSource = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');
    const entityEditorSource = readFileSync(resolve(process.cwd(), 'components/pages/entity-editor-surface.tsx'), 'utf8');
    const entitiesSource = readFileSync(resolve(process.cwd(), 'app/entities/page.tsx'), 'utf8');

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
    const monitorEditorSource = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');
    const entityEditorSource = readFileSync(resolve(process.cwd(), 'components/pages/entity-editor-surface.tsx'), 'utf8');
    const entitiesSource = readFileSync(resolve(process.cwd(), 'app/entities/page.tsx'), 'utf8');

    expect(editorRowsSource).toContain('border-[var(--ops-border-color)]');
    expect(editorRowsSource).toContain('bg-[var(--ops-surface-panel)]');
    expect(editorRowsSource).toContain('text-[var(--ops-text-primary)]');
    expect(editorRowsSource).toContain('text-[var(--ops-text-secondary)]');
    expect(editorRowsSource).toContain('hover:bg-[var(--ops-surface-hover)]');

    expect(monitorEditorSource).toContain('border-[var(--ops-border-color)]');
    expect(monitorEditorSource).toContain('bg-[var(--ops-surface-panel)]');
    expect(monitorEditorSource).toContain('text-[var(--ops-text-primary)]');
    expect(monitorEditorSource).toContain('text-[var(--ops-text-secondary)]');
    expect(monitorEditorSource).toContain('text-[var(--ops-text-tertiary)]');

    expect(entityEditorSource).toContain('data-entity-editor-shell="otlp-cold-entity-composer"');
    expect(entityEditorSource).toContain('data-entity-editor-style-baseline="hertzbeat-cold-matte"');
    expect(entityEditorSource).toContain('data-entity-editor-frame="cold-editor-frame"');
    expect(entityEditorSource).toContain('data-entity-editor-definition-footer="cold-definition-footer"');
    expect(entityEditorSource).toContain('data-entity-editor-definition-tabs="cold-bottom-tabs"');

    expect(entitiesSource).toContain('EntityListSurface');
    expect(entitiesSource).not.toContain('SummaryMetricGrid');
    expect(entitiesSource).not.toContain('StageSection');
    expect(entitiesSource).not.toContain('DrawerSection');
    expect(entitiesSource).not.toContain('DrawerCodePreview');
    expect(entitiesSource).not.toContain('ObservabilityStatusState');
  });

  it('keeps the active monitor/entity edit routes composed from the shared editor owners', () => {
    const monitorEditSource = readFileSync(resolve(process.cwd(), 'app/monitors/[monitorId]/edit/page.tsx'), 'utf8');
    const entityNewSource = readFileSync(resolve(process.cwd(), 'app/entities/new/page.tsx'), 'utf8');
    const entityEditSource = readFileSync(resolve(process.cwd(), 'app/entities/[entityId]/edit/page.tsx'), 'utf8');

    expect(monitorEditSource).toContain('MonitorEditorSurface');
    expect(entityNewSource).toContain('EntityEditorSurface');
    expect(entityEditSource).toContain('EntityEditorSurface');
  });
});
