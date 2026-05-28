import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('entity detail family cold-workbench chrome', () => {
  it('removes the remaining legacy white-on-black chrome from the current entity slice', () => {
    const detailSource = readFileSync(resolve(process.cwd(), 'app/entities/[entityId]/entity-detail-page.tsx'), 'utf8');
    const definitionSource = readFileSync(resolve(process.cwd(), 'components/pages/entity-definition-workspace-surface.tsx'), 'utf8');

    expect(detailSource).not.toContain('text-white/55');

    expect(definitionSource).not.toContain('border-white/10');
    expect(definitionSource).not.toContain('bg-white/[0.03]');
    expect(definitionSource).not.toContain('text-white');
    expect(definitionSource).not.toContain('text-white/62');
    expect(definitionSource).not.toContain('text-white/45');
    expect(definitionSource).not.toContain('text-white/40');
    expect(definitionSource).not.toContain('text-white/30');
    expect(definitionSource).not.toContain('rounded-[20px]');
    expect(definitionSource).not.toContain('rounded-[22px]');
  });

  it('adopts shared ops tokens across the current entity slice', () => {
    const detailSource = readFileSync(resolve(process.cwd(), 'app/entities/[entityId]/entity-detail-page.tsx'), 'utf8');
    const detailSurfaceSource = readFileSync(resolve(process.cwd(), 'components/pages/entity-detail-surface.tsx'), 'utf8');
    const definitionSource = readFileSync(resolve(process.cwd(), 'components/pages/entity-definition-workspace-surface.tsx'), 'utf8');

    expect(detailSource).toContain("from '@/components/pages/entity-detail-surface'");
    expect(detailSource).not.toContain('StageSection');
    expect(detailSource).not.toContain('DrawerSection');
    expect(detailSource).not.toContain('ObservabilityStatusState');
    expect(detailSource).not.toContain('WorkbenchPage');
    expect(detailSource).not.toContain('components/workbench/primitives');
    expect(detailSurfaceSource).toContain('coldOpsCatalogVisual');
    expect(detailSurfaceSource).toContain('data-entity-detail-surface="otlp-cold-entity-detail"');
    expect(detailSurfaceSource).toContain('data-entity-detail-layout="full-width-workbench"');
    expect(detailSurfaceSource).not.toContain('StageSection');
    expect(detailSurfaceSource).not.toContain('DrawerSection');
    expect(detailSurfaceSource).not.toContain('WorkbenchPage');

    expect(definitionSource).toContain('coldOpsCatalogVisual');
    expect(definitionSource).toContain('data-entity-definition-layout="full-width-workbench"');
    expect(definitionSource).toContain('data-entity-definition-editor-shell="otlp-cold-definition-workbench"');
    expect(definitionSource).toContain('WorkbenchInsetPanel');
    expect(definitionSource).not.toContain(
      'rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] p-3.5'
    );
  });
});
