import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ObservabilityStatusState } from './status-state';

describe('observability status state', () => {
  it('renders the default status shell on shared ops tokens', () => {
    const html = renderToStaticMarkup(
      <ObservabilityStatusState title="No results" copy="Adjust filters" />
    );

    expect(html).toContain('No results');
    expect(html).toContain('Adjust filters');
    expect(html).toContain('border-[var(--ops-border-color)]');
    expect(html).toContain('bg-[var(--ops-surface-panel)]');
    expect(html).toContain('text-[var(--ops-text-primary)]');
    expect(html).toContain('text-[var(--ops-text-secondary)]');
  });

  it('renders the danger tone with shared critical chrome', () => {
    const html = renderToStaticMarkup(
      <ObservabilityStatusState title="No results" copy="Adjust filters" tone="danger" />
    );

    expect(html).toContain('No results');
    expect(html).toContain('Adjust filters');
    expect(html).toContain('border-[rgba(216,111,91,0.28)]');
    expect(html).toContain('bg-[rgba(216,111,91,0.08)]');
    expect(html).toContain('text-[var(--ops-text-primary)]');
  });
});
