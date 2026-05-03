import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ObservabilityStatusBadge } from './status-badge';

describe('observability status badge', () => {
  it('renders the shared status badge tone and label', () => {
    const html = renderToStaticMarkup(
      <ObservabilityStatusBadge label="UP" tone="success" />
    );

    expect(html).toContain('UP');
    expect(html).toContain('border-[rgba(76,183,130,0.24)]');
    expect(html).toContain('bg-[rgba(76,183,130,0.08)]');
    expect(html).toContain('text-[var(--ops-text-primary)]');
  });

  it('keeps the default badge on shared neutral ops tokens', () => {
    const html = renderToStaticMarkup(
      <ObservabilityStatusBadge label="PAUSED" />
    );

    expect(html).toContain('PAUSED');
    expect(html).toContain('border-[var(--ops-border-color)]');
    expect(html).toContain('bg-[var(--ops-surface-raised)]');
    expect(html).toContain('text-[var(--ops-text-secondary)]');
  });
});
