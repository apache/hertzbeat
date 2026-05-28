import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceTabStrip } from './workspace-tab-strip';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

describe('workspace tab strip', () => {
  it('renders shared card tabs with ops-shell chrome', () => {
    const html = renderToStaticMarkup(
      <WorkspaceTabStrip
        variant="card"
        tabs={[
          { key: 'summary', label: 'Summary', href: '/summary', active: true },
          { key: 'details', label: 'Details', href: '/details' }
        ]}
      />
    );

    expect(html).toContain('Summary');
    expect(html).toContain('Details');
    expect(html).toContain('aria-label="Workspace navigation"');
    expect(html).toContain('border-[var(--ops-border-color)]');
    expect(html).toContain('bg-[var(--ops-surface-panel)]');
    expect(html).toContain('bg-[var(--ops-surface-raised)]');
    expect(html).toContain('text-[var(--ops-text-primary)]');
    expect(html).toContain('text-[var(--ops-text-secondary)]');
    expect(html).not.toContain('text-[#f3eee6]');
    expect(html).not.toContain('bg-[linear-gradient(');
    expect(html).not.toContain('border-white/8');
  });

  it('renders shared default tabs with ops-shell chrome and badge treatment', () => {
    const html = renderToStaticMarkup(
      <WorkspaceTabStrip
        ariaLabel="Custom workspace sections"
        tabs={[
          { key: 'all', label: 'All', active: true, badge: '4' },
          { key: 'errors', label: 'Errors', onSelect: () => {} }
        ]}
      />
    );

    expect(html).toContain('All');
    expect(html).toContain('Errors');
    expect(html).toContain('>4<');
    expect(html).toContain('aria-label="Custom workspace sections"');
    expect(html).toContain('border-[var(--ops-primary)]');
    expect(html).toContain('bg-[var(--ops-surface-raised)]');
    expect(html).toContain('text-[var(--ops-text-tertiary)]');
    expect(html).not.toContain('hsl(var(--card))');
    expect(html).not.toContain('hsl(var(--accent))');
  });
});
