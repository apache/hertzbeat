import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ObservabilitySelectableCardGrid } from './selectable-card-grid';

describe('ObservabilitySelectableCardGrid', () => {
  it('renders card-style selectable evidence tiles', () => {
    const html = renderToStaticMarkup(
      <ObservabilitySelectableCardGrid
        cards={[
          {
            key: 'summary',
            title: 'summary',
            copy: '0',
            meta: 'fields',
            extra: <button type="button">action</button>
          },
          { key: 'header', title: 'header', copy: '0', meta: 'fields' },
        ]}
        selectedKey="summary"
        onSelect={vi.fn()}
      />
    );

    expect(html).toContain('summary');
    expect(html).toContain('header');
    expect(html).toContain('data-card-selected="true"');
    expect(html).toContain('data-card-selected="false"');
    expect(html).toContain('<button type="button" class="w-full cursor-pointer');
    expect(html).toContain('>action</button>');
    expect(html).toContain('border-[var(--ops-primary)]');
    expect(html).toContain('bg-[var(--ops-surface-raised)]');
    expect(html).toContain('text-[var(--ops-text-primary)]');
    expect(html).toContain('text-[var(--ops-text-secondary)]');
  });

  it('keeps operator cards on shared ops tokens', () => {
    const html = renderToStaticMarkup(
      <ObservabilitySelectableCardGrid
        tone="operator"
        cards={[
          { key: 'summary', title: 'summary', copy: '0', meta: 'fields' },
          { key: 'header', title: 'header', copy: '1', meta: 'fields' },
        ]}
        selectedKey="summary"
        onSelect={vi.fn()}
      />
    );

    expect(html).toContain('summary');
    expect(html).toContain('border-[var(--ops-primary)]');
    expect(html).toContain('bg-[var(--ops-surface-raised)]');
    expect(html).toContain('text-[var(--ops-text-primary)]');
    expect(html).not.toContain('border-white/12');
  });
});
