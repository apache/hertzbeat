import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TemplateRow } from './editor-rows';

describe('editor rows', () => {
  it('keeps multiline editors on the shared Textarea or code editor instead of the old editor row', () => {
    const editorRowsSource = readFileSync(resolve(process.cwd(), 'components/observability/editor-rows.tsx'), 'utf8');
    const primitivesSource = readFileSync(resolve(process.cwd(), 'components/workbench/primitives.tsx'), 'utf8');
    const parityKitSource = readFileSync(resolve(process.cwd(), 'components/parity/angular-parity-kit.tsx'), 'utf8');

    expect(editorRowsSource).not.toContain('EditorRow');
    expect(editorRowsSource).not.toContain('TextareaHTMLAttributes');
    expect(editorRowsSource).not.toContain('<textarea');
    expect(primitivesSource).not.toContain('EditorRow');
    expect(parityKitSource).not.toContain('EditorRow');
  });

  it('renders the shared template row with ops shell tokens', () => {
    const html = renderToStaticMarkup(<TemplateRow>Link provider</TemplateRow>);

    expect(html).toContain('border-[var(--ops-border-color)]');
    expect(html).toContain('bg-[var(--ops-surface-panel)]');
    expect(html).toContain('text-[var(--ops-text-secondary)]');
    expect(html).toContain('hover:border-[var(--ops-primary)]');
    expect(html).toContain('hover:bg-[var(--ops-surface-hover)]');
    expect(html).not.toContain('border-white/8');
    expect(html).not.toContain('bg-white/[0.025]');
    expect(html).not.toContain('hover:border-white/14');
    expect(html).not.toContain('hover:bg-white/[0.045]');
  });
});
