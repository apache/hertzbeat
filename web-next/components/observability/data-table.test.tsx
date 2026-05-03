import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DataTable } from './data-table';

describe('observability data table', () => {
  it('renders shared table chrome with ops tokens for populated tables', () => {
    const html = renderToStaticMarkup(
      <DataTable
        columns={[
          { accessorKey: 'name', header: 'Name' },
          { accessorKey: 'value', header: 'Value' }
        ]}
        data={[
          { id: '1', name: 'checkout', value: '72' },
          { id: '2', name: 'inventory', value: '64' }
        ]}
        tableOptions={{ getRowId: row => (row as any).id }}
      />
    );

    expect(html).toContain('Name');
    expect(html).toContain('Value');
    expect(html).toContain('checkout');
    expect(html).toContain('72');
    expect(html).toContain('border-[var(--ops-border-color)]');
    expect(html).toContain('bg-[var(--ops-surface-panel)]');
    expect(html).toContain('bg-[var(--ops-surface-raised)]');
    expect(html).toContain('text-[var(--ops-text-primary)]');
    expect(html).toContain('text-[var(--ops-text-tertiary)]');
    expect(html).not.toContain('hsl(var(--card))');
    expect(html).not.toContain('hsl(var(--border))');
  });

  it('renders shared table chrome with ops tokens for empty tables', () => {
    const html = renderToStaticMarkup(
      <DataTable
        columns={[
          { accessorKey: 'name', header: 'Name' }
        ]}
        data={[]}
        emptyState="No monitors"
      />
    );

    expect(html).toContain('No monitors');
    expect(html).toContain('text-[var(--ops-text-secondary)]');
    expect(html).not.toContain('hsl(var(--muted-foreground))');
  });
});
