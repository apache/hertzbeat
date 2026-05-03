import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('explorer and bulletin cold-workbench chrome', () => {
  it('removes the remaining legacy white-on-black and cyan shell chrome from the current slice', () => {
    const discoverySource = readFileSync(resolve(process.cwd(), 'components/pages/entity-discovery-surface.tsx'), 'utf8');
    const bulletinMetricsSource = readFileSync(resolve(process.cwd(), 'components/pages/bulletin-metrics-table.tsx'), 'utf8');
    const bulletinDialogSource = readFileSync(resolve(process.cwd(), 'components/pages/bulletin-manage-dialog.tsx'), 'utf8');

    expect(discoverySource).not.toContain('border-white/10');
    expect(discoverySource).not.toContain('border-white/12');
    expect(discoverySource).not.toContain('bg-white/5');
    expect(discoverySource).not.toContain('bg-white/6');
    expect(discoverySource).not.toContain('bg-white/8');
    expect(discoverySource).not.toContain('bg-slate-950/70');
    expect(discoverySource).not.toContain('bg-slate-950/65');
    expect(discoverySource).not.toContain('text-white/');
    expect(discoverySource).not.toContain('text-cyan-');
    expect(discoverySource).not.toContain('bg-cyan-');
    expect(discoverySource).not.toContain('border-cyan-');
    expect(discoverySource).not.toContain('rounded-[24px]');
    expect(discoverySource).not.toContain('rounded-[20px]');
    expect(discoverySource).not.toContain('rounded-[18px]');
    expect(discoverySource).not.toContain('rounded-[16px]');

    expect(bulletinMetricsSource).not.toContain('text-white/58');
    expect(bulletinMetricsSource).not.toContain('border-white/10');
    expect(bulletinMetricsSource).not.toContain('border-white/8');
    expect(bulletinMetricsSource).not.toContain('text-[#d6d0c6]');
    expect(bulletinMetricsSource).not.toContain('text-[#a69d90]');
    expect(bulletinMetricsSource).not.toContain('text-[#8ab4ff]');
    expect(bulletinMetricsSource).not.toContain('text-[#b6d0ff]');
    expect(bulletinMetricsSource).not.toContain('text-white/76');
    expect(bulletinMetricsSource).not.toContain('text-white/32');
    expect(bulletinMetricsSource).not.toContain('bg-white/[0.02]');
    expect(bulletinMetricsSource).not.toContain('text-white/88');

    expect(bulletinDialogSource).not.toContain('text-[#b5ada1]');
    expect(bulletinDialogSource).not.toContain('border-white/10');
    expect(bulletinDialogSource).not.toContain('bg-white/[0.03]');
    expect(bulletinDialogSource).not.toContain('text-white/82');
    expect(bulletinDialogSource).not.toContain('focus:border-[rgba(122,164,255,.36)]');
    expect(bulletinDialogSource).not.toContain('focus:bg-white/[0.05]');
  });

  it('adopts shared ops tokens and shared editor/input owners across the current slice', () => {
    const discoverySource = readFileSync(resolve(process.cwd(), 'components/pages/entity-discovery-surface.tsx'), 'utf8');
    const bulletinMetricsSource = readFileSync(resolve(process.cwd(), 'components/pages/bulletin-metrics-table.tsx'), 'utf8');
    const bulletinDialogSource = readFileSync(resolve(process.cwd(), 'components/pages/bulletin-manage-dialog.tsx'), 'utf8');

    expect(discoverySource).toContain("from '../ui/search-row'");
    expect(discoverySource).toContain('coldOpsCatalogVisual');
    expect(discoverySource).toContain('data-entity-discovery-search-owner="shared-search-row"');
    expect(discoverySource).toContain('data-entity-discovery-style-baseline={coldEntityDiscoveryVisual.canvasName}');

    expect(bulletinMetricsSource).toContain('border-[var(--ops-border-color)]');
    expect(bulletinMetricsSource).toContain('bg-[var(--ops-surface-raised)]');
    expect(bulletinMetricsSource).toContain('text-[var(--ops-text-primary)]');
    expect(bulletinMetricsSource).toContain('text-[var(--ops-text-secondary)]');
    expect(bulletinMetricsSource).toContain('text-[var(--ops-text-tertiary)]');
    expect(bulletinMetricsSource).toContain('text-[var(--ops-primary)]');

    expect(bulletinDialogSource).toContain('ColdCodeEditor');
    expect(bulletinDialogSource).toContain('data-bulletin-fields-code-editor="metrics-json"');
    expect(bulletinDialogSource).not.toContain('EditorRow');
    expect(bulletinDialogSource).toContain('text-[var(--ops-text-secondary)]');
    expect(bulletinDialogSource).toContain('border-[var(--ops-border-color)]');
    expect(bulletinDialogSource).toContain('bg-[var(--ops-surface-panel)]');
  });
});
