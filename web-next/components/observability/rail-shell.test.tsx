import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ObservabilityRailShell } from './rail-shell';

describe('observability rail shell', () => {
  it('renders a shared rail shell title and body', () => {
    const html = renderToStaticMarkup(
      <ObservabilityRailShell title="Selected trace">
        <div>trace-body</div>
      </ObservabilityRailShell>
    );

    expect(html).toContain('Selected trace');
    expect(html).toContain('trace-body');
  });

  it('uses the cold-workbench rail tokens for deck rails', () => {
    const html = renderToStaticMarkup(
      <ObservabilityRailShell title="Selected trace" tone="deck">
        <div>trace-body</div>
      </ObservabilityRailShell>
    );

    expect(html).toContain('rounded-[10px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-elevated)]');
    expect(html).toContain('text-[var(--ops-text-tertiary)]');
    expect(html).not.toContain('rounded-[18px]');
    expect(html).not.toContain('linear-gradient(180deg');
  });

  it('supports flat deck rails for stackless workbench strips', () => {
    const html = renderToStaticMarkup(
      <ObservabilityRailShell title="Selected trace" tone="deck" variant="flat">
        <div>trace-body</div>
      </ObservabilityRailShell>
    );

    expect(html).toContain('rounded-none');
    expect(html).toContain('border-x-0');
    expect(html).toContain('border-b-0');
    expect(html).toContain('border-t');
    expect(html).toContain('bg-transparent');
    expect(html).not.toContain('rounded-[10px]');
    expect(html).not.toContain('bg-[var(--ops-surface-elevated)]');
  });
});
