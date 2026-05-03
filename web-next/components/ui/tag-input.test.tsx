import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TagInput } from './tag-input';

describe('TagInput', () => {
  it('renders selected labels as removable cold chips instead of plain text', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/ui/tag-input.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <TagInput
        name="labels"
        value="alertname, service"
        onValueChange={() => {}}
        placeholder="alertname, severity, service"
        suggestions={['alertname', 'instance', 'severity', 'service']}
      />
    );

    expect(html).toContain('data-cold-tag-input-owner="cold-tag-input"');
    expect(html).toContain('data-cold-tag-input-mode="searchable-tags"');
    expect(html).toContain('data-cold-tag-chip="alertname"');
    expect(html).toContain('data-cold-tag-chip="service"');
    expect(html).toContain('data-cold-tag-remove="alertname"');
    expect(html).toContain('data-cold-tag-remove="service"');
    expect(html).toContain('data-cold-tag-input-control="draft"');
    expect(html).toContain('data-cold-tag-input-value="hidden"');
    expect(html).toContain('type="hidden"');
    expect(html).toContain('rounded-[3px]');
    expect(html).not.toContain('data-cold-tag-suggestion=');
    expect(html).not.toContain('data-cold-tag-suggestions-owner=');
    expect(html).not.toContain('<select');
    expect(html).not.toContain('<datalist');
    expect(source).toContain('data-cold-tag-suggestions-owner="cold-search-popover"');
    expect(source).toContain('data-cold-tag-suggestions-position="fixed-anchored"');
    expect(source).toContain('getBoundingClientRect');
    expect(source).toContain('max-h-40');
    expect(source).toContain('overflow-y-auto');
  });
});
