import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  it('uses HertzBeat cold control chrome', () => {
    const html = renderToStaticMarkup(<Input placeholder="Search monitors" />);

    expect(html).toContain('rounded-[2px]');
    expect(html).toContain('bg-[var(--ops-surface-raised)]');
    expect(html).toContain('border-[var(--ops-border-color)]');
    expect(html).toContain('text-[12px]');
  });
});
