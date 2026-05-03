import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ObservabilitySearchInput } from './search-input';

describe('ObservabilitySearchInput', () => {
  it('renders the shared search shell', () => {
    const html = renderToStaticMarkup(
      <ObservabilitySearchInput value="db" onChange={vi.fn()} placeholder="Search history series" />
    );

    expect(html).toContain('Search history series');
    expect(html).toContain('value="db"');
    expect(html).toContain('border-[var(--ops-border-color)]');
    expect(html).toContain('bg-[var(--ops-surface-raised)]');
    expect(html).toContain('text-[var(--ops-text-primary)]');
    expect(html).not.toContain('bg-black/10');
    expect(html).not.toContain('text-white');
  });
});
