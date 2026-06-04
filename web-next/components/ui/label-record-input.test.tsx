import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LabelRecordInput } from './label-record-input';

describe('LabelRecordInput', () => {
  it('renders searchable key/value label rows with removable chips and HertzBeat UI owner markers', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/ui/label-record-input.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <LabelRecordInput
        name="labels"
        value="service:checkout, severity:critical"
        labelOptions={{
          keys: ['alertname', 'service', 'severity'],
          valuesByKey: {
            service: ['checkout', 'billing'],
            severity: ['critical', 'warning']
          }
        }}
        onValueChange={() => {}}
      />
    );

    expect(html).toContain('data-hz-label-selector-owner="hertzbeat-ui-label-selector"');
    expect(html).toContain('data-hz-label-selector-shell="unframed-inline"');
    expect(html).toContain('data-hz-label-selector-row-layout="full-row-equal-key-value-with-action"');
    expect(html).toContain('data-hz-label-selector-record-row="service:checkout"');
    expect(html).toContain('data-hz-label-selector-record-row="severity:critical"');
    expect(html).toContain('data-hz-label-selector-remove-row="service:checkout"');
    expect(html).toContain('data-hz-label-selector-draft-row="true"');
    expect(html).toContain('data-hz-label-selector-key-input="searchable-key"');
    expect(html).toContain('data-hz-label-selector-value-input="searchable-value"');
    expect(html).toContain('data-hz-label-selector-value="hidden"');
    expect(html).toContain('type="hidden"');
    expect(html).toContain('placeholder="Label key"');
    expect(html).toContain('placeholder="Label value"');
    expect(html).toContain('>Add<');
    expect(html).toContain('>Remove<');
    expect(html).toContain('aria-label="Remove service:checkout"');
    expect(html).toContain('rounded-[3px]');
    expect(html).not.toContain('data-hz-label-selector-chip-list="true"');
    expect(html).not.toContain('data-hz-label-selector-chip=');
    expect(html).not.toContain('data-hz-label-selector-suggestion=');
    expect(html).not.toContain('data-hz-label-selector-suggestions=');
    expect(html).not.toContain('<select');
    expect(html).not.toContain('<datalist');
    expect(source).toContain('data-hz-label-selector-popover="keys"');
    expect(source).toContain('data-hz-label-selector-popover="values"');
    expect(source).toContain('data-hz-label-selector-popover-position="fixed-anchored"');
    expect(source).toContain('getBoundingClientRect');
    expect(source).toContain('max-h-40');
    expect(source).toContain('overflow-y-auto');
  });
});
