import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FieldWrapper, ToolbarField, ToolbarGroup, ToolbarInput, ToolbarNativeSelect, ToolbarRow } from './toolbar';

describe('workbench toolbar shared owners', () => {
  it('renders dense toolbar semantics through workbench entrypoints', () => {
    const html = renderToStaticMarkup(
      <ToolbarRow className="grid-cols-2" density="compact">
        <ToolbarGroup>
          <ToolbarField label="Service">
            <ToolbarInput value="checkout" readOnly />
          </ToolbarField>
          <FieldWrapper label="Region">
            <ToolbarNativeSelect defaultValue="cn">
              <option value="cn">China</option>
            </ToolbarNativeSelect>
          </FieldWrapper>
        </ToolbarGroup>
      </ToolbarRow>
    );

    expect(html).toContain('rounded-[4px]');
    expect(html).toContain('tracking-[0.16em]');
    expect(html).toContain('value="checkout"');
    expect(html).toContain('data-hz-select-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-hz-select-control="custom-trigger"');
    expect(html).toContain('appearance-none');
    expect(html).toContain('rounded-[3px]');
    expect(html).toContain('China');
  });
});
