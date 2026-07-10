import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ToolbarField, ToolbarInput, ToolbarNativeSelect, ToolbarRow } from './toolbar';

describe('observability toolbar', () => {
  it('uses the shared cold-workbench toolbar and field tokens', () => {
    const html = renderToStaticMarkup(
      <ToolbarRow>
        <ToolbarField label="Service">
          <ToolbarInput value="checkout" readOnly />
        </ToolbarField>
        <ToolbarField label="Status">
          <ToolbarNativeSelect defaultValue="all">
            <option value="all">All</option>
          </ToolbarNativeSelect>
        </ToolbarField>
      </ToolbarRow>
    );

    expect(html).toContain('border-[var(--ops-border-color)]');
    expect(html).toContain('bg-[var(--ops-surface-panel)]');
    expect(html).toContain('data-hz-select-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-hz-select-control="custom-trigger"');
    expect(html).toContain('data-hz-select-icon="chevron"');
    expect(html).toContain('appearance-none');
    expect(html).toContain('rounded-[3px]');
    expect(html).toContain('bg-[#101217]');
    expect(html).toContain('text-[var(--ops-text-tertiary)]');
    expect(html).toContain('text-[var(--ops-text-primary)]');
    expect(html).not.toContain('bg-white/[0.03]');
    expect(html).not.toContain('text-white/82');
  });
});
