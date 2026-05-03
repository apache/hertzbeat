import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ObservabilityChipToggle } from './chip-toggle';

describe('ObservabilityChipToggle', () => {
  it('renders selected state and custom selection attribute', () => {
    const html = renderToStaticMarkup(
      <ObservabilityChipToggle selected selectionAttrName="data-chart-selected">
        Mean
      </ObservabilityChipToggle>
    );

    expect(html).toContain('Mean');
    expect(html).toContain('data-chart-selected="true"');
    expect(html).toContain('border-[var(--ops-primary)]');
    expect(html).toContain('bg-[var(--ops-surface-raised)]');
    expect(html).toContain('text-[var(--ops-text-primary)]');
  });

  it('keeps operator tone on shared ops tokens when idle', () => {
    const html = renderToStaticMarkup(
      <ObservabilityChipToggle tone="operator">
        Only selected
      </ObservabilityChipToggle>
    );

    expect(html).toContain('Only selected');
    expect(html).toContain('border-[var(--ops-border-color)]');
    expect(html).toContain('text-[var(--ops-text-secondary)]');
    expect(html).toContain('hover:border-[var(--ops-primary)]');
  });
});
