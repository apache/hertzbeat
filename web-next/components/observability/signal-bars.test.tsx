import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ObservabilitySignalBars } from './signal-bars';

describe('ObservabilitySignalBars', () => {
  it('renders shared signal bars on ops tokens', () => {
    const html = renderToStaticMarkup(
      <ObservabilitySignalBars
        items={[
          { label: 'usage', value: '72 %', widthPercent: 72 },
          { label: 'idle', value: '28 %', widthPercent: 28 }
        ]}
      />
    );

    expect(html).toContain('usage');
    expect(html).toContain('72 %');
    expect(html).toContain('text-[var(--ops-text-secondary)]');
    expect(html).toContain('bg-[var(--ops-surface-raised)]');
    expect(html).toContain('bg-[var(--ops-primary)]');
    expect(html).toContain('width:72%');
    expect(html).toContain('width:28%');
  });
});
