import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CodePane } from './code-pane';

describe('observability code pane', () => {
  it('uses the shared cold-workbench code surface tokens', () => {
    const html = renderToStaticMarkup(<CodePane>{'{ "traceId": "abc" }'}</CodePane>);

    expect(html).toContain('border-[var(--ops-border-color)]');
    expect(html).toContain('bg-[var(--ops-surface-raised)]');
    expect(html).toContain('text-[var(--ops-text-secondary)]');
    expect(html).not.toContain('border-white/10');
    expect(html).not.toContain('text-white/62');
  });
});
