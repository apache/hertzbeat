import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ObservabilitySelectableRows, ObservabilitySelectableRowsOrDetails } from './selectable-rows';

describe('ObservabilitySelectableRows', () => {
  it('renders a selectable evidence list with a custom selection attribute', () => {
    const html = renderToStaticMarkup(
      <ObservabilitySelectableRows
        heading="Series samples"
        rows={[
          { key: 'host=db-1', title: 'host=db-1', copy: 'min 20', meta: 't1' },
          { key: 'host=db-2', title: 'host=db-2', copy: 'min 24', meta: 't2' },
        ]}
        selectedKey="host=db-2"
        selectionAttrName="data-series-selected"
        onSelect={vi.fn()}
      />
    );

    expect(html).toContain('Series samples');
    expect(html).toMatch(/data-series-selected="true"[\s\S]*host=db-2/);
    expect(html).toMatch(/data-series-selected="false"[\s\S]*host=db-1/);
    expect(html).toContain('border-[var(--ops-primary)]');
    expect(html).toContain('text-[var(--ops-text-primary)]');
    expect(html).toContain('text-[var(--ops-text-secondary)]');
    expect(html).toContain('text-[var(--ops-text-tertiary)]');
  });

  it('falls back to detail rows when only empty rows are present', () => {
    const html = renderToStaticMarkup(
      <ObservabilitySelectableRowsOrDetails
        rows={[{ key: 'empty', title: 'status', copy: '-', meta: '-' }]}
        selectedKey={null}
        onSelect={vi.fn()}
      />
    );

    expect(html).toContain('status');
    expect(html).not.toContain('data-selected=');
  });

  it('keeps operator rows on shared ops tokens', () => {
    const html = renderToStaticMarkup(
      <ObservabilitySelectableRows
        heading="Compare set"
        rows={[
          { key: 'host=db-1', title: 'host=db-1', copy: 'selected point', meta: 'min 24 · max 31 · t2' },
        ]}
        selectedKey="host=db-1"
        onSelect={vi.fn()}
        tone="operator"
      />
    );

    expect(html).toContain('Compare set');
    expect(html).toContain('border-[var(--ops-primary)]');
    expect(html).toContain('bg-[var(--ops-surface-raised)]');
    expect(html).toContain('text-[var(--ops-text-primary)]');
    expect(html).not.toContain('border-white/12');
  });
});
