/*
 * Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements.
 */

// @vitest-environment jsdom

import { EditorView } from '@codemirror/view';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RuntimeThemeContext } from '@/core/runtime-theme-context';
import type { RuntimeTheme } from '@/core/runtime-preferences';

import { YamlDiffEditor, YamlEditor } from './yaml-editor';

describe('YAML editors', () => {
  afterEach(cleanup);

  it('uses one native merge view for aligned comparison and draft editing', () => {
    const onChange = vi.fn();
    renderWithTheme(
      'default',
      <YamlDiffEditor
        originalAriaLabel="Current version"
        modifiedAriaLabel="Draft YAML"
        originalValue="app: mysql"
        modifiedValue={'app: mysql\nname: draft'}
        onChange={onChange}
      />
    );

    const host = document.querySelector('[data-hb-yaml-editor="codemirror-merge"]');
    expect(host).toContainElement(document.querySelector('.cm-mergeView'));
    expect(document.querySelectorAll('.cm-mergeView')).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: 'Current version' })).toHaveAttribute('contenteditable', 'false');
    const draft = screen.getByRole('textbox', { name: 'Draft YAML' });
    expect(draft).toHaveAttribute('contenteditable', 'true');

    const draftView = EditorView.findFromDOM(draft)!;
    act(() => draftView.dispatch({ changes: { from: draftView.state.doc.length, insert: '\nname: changed' } }));
    expect(onChange).toHaveBeenLastCalledWith('app: mysql\nname: draft\nname: changed');
  });

  it('keeps single-document create mode in the same adapter', () => {
    renderWithTheme('dark', <YamlEditor ariaLabel="Draft YAML" value="app: mysql" readOnly />);

    expect(document.querySelector('[data-hb-yaml-editor="codemirror"]')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Draft YAML' })).toHaveAttribute('contenteditable', 'false');
  });
});

function renderWithTheme(theme: RuntimeTheme, editor: React.ReactNode) {
  return render(
    <RuntimeThemeContext.Provider value={{ theme, setTheme: vi.fn() }}>{editor}</RuntimeThemeContext.Provider>
  );
}
