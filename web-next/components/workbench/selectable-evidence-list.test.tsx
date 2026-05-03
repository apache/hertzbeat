import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SelectableEvidenceList } from './selectable-evidence-list';

describe('SelectableEvidenceList', () => {
  it('renders keyboard-selectable rows without nesting buttons', () => {
    const html = renderToStaticMarkup(
      <SelectableEvidenceList
        rows={[
          {
            key: 'summary',
            title: 'summary',
            copy: 'Favorite realtime metric',
            meta: 'realtime',
            extra: <button type="button">action</button>
          }
        ]}
        selectedKey="summary"
        onSelect={vi.fn()}
      />
    );

    expect(html).toContain('summary');
    expect(html).toContain('<button type="button" class="grid w-full gap-1 text-left');
    expect(html).toContain('>action</button>');
    expect(html).toContain('border-[var(--ops-border-color)]');
    expect(html).toContain('text-[var(--ops-text-primary)]');
    expect(html).toContain('text-[var(--ops-text-secondary)]');
    expect(html).toContain('text-[var(--ops-text-tertiary)]');
    expect(html).not.toContain('border-white/10');
    expect(html).not.toContain('text-white/65');
  });
});
