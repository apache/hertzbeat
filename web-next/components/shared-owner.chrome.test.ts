import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('shared tab-strip and data-table cold-workbench chrome', () => {
  it('removes the remaining legacy white, gradient, and hsl-based chrome from the current shared-owner slice', () => {
    const tabStripSource = readFileSync(resolve(process.cwd(), 'components/workbench/workspace-tab-strip.tsx'), 'utf8');
    const dataTableSource = readFileSync(resolve(process.cwd(), 'components/observability/data-table.tsx'), 'utf8');

    expect(tabStripSource).not.toContain('border-white/12');
    expect(tabStripSource).not.toContain('border-white/8');
    expect(tabStripSource).not.toContain('border-white/14');
    expect(tabStripSource).not.toContain('bg-[linear-gradient(');
    expect(tabStripSource).not.toContain('bg-[rgba(');
    expect(tabStripSource).not.toContain('text-[#f3eee6]');
    expect(tabStripSource).not.toContain('text-[#9f988c]');
    expect(tabStripSource).not.toContain('text-[#ece5d9]');
    expect(tabStripSource).not.toContain('hsl(var(--border))');
    expect(tabStripSource).not.toContain('hsl(var(--card))');
    expect(tabStripSource).not.toContain('hsl(var(--muted-foreground))');
    expect(tabStripSource).not.toContain('hsl(var(--foreground))');
    expect(tabStripSource).not.toContain('hsl(var(--accent))');

    expect(dataTableSource).not.toContain('hsl(var(--border))');
    expect(dataTableSource).not.toContain('hsl(var(--card))');
    expect(dataTableSource).not.toContain('hsl(var(--secondary)/0.25)');
    expect(dataTableSource).not.toContain('hsl(var(--muted-foreground))');
    expect(dataTableSource).not.toContain('hsl(var(--secondary)/0.2)');
    expect(dataTableSource).not.toContain('hsl(var(--foreground))');
  });

  it('adopts shared ops tokens across the current shared-owner slice', () => {
    const tabStripEntrypointSource = readFileSync(resolve(process.cwd(), 'components/workbench/workspace-tab-strip.tsx'), 'utf8');
    const tabStripSource = readFileSync(resolve(process.cwd(), 'components/observability/workspace-tab-strip.tsx'), 'utf8');
    const dataTableSource = readFileSync(resolve(process.cwd(), 'components/observability/data-table.tsx'), 'utf8');

    expect(tabStripEntrypointSource).toContain("from '../observability/workspace-tab-strip'");
    expect(tabStripSource).toContain('border-[var(--ops-border-color)]');
    expect(tabStripSource).toContain('bg-[var(--ops-surface-panel)]');
    expect(tabStripSource).toContain('bg-[var(--ops-surface-raised)]');
    expect(tabStripSource).toContain('text-[var(--ops-text-primary)]');
    expect(tabStripSource).toContain('text-[var(--ops-text-secondary)]');
    expect(tabStripSource).toContain('text-[var(--ops-text-tertiary)]');
    expect(tabStripSource).toContain('border-[var(--ops-primary)]');

    expect(dataTableSource).toContain('border-[var(--ops-border-color)]');
    expect(dataTableSource).toContain('bg-[var(--ops-surface-panel)]');
    expect(dataTableSource).toContain('bg-[var(--ops-surface-raised)]');
    expect(dataTableSource).toContain('text-[var(--ops-text-primary)]');
    expect(dataTableSource).toContain('text-[var(--ops-text-secondary)]');
    expect(dataTableSource).toContain('text-[var(--ops-text-tertiary)]');
  });
});
