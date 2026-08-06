/*
 * Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements.
 */

// @vitest-environment jsdom

import { EditorView } from '@codemirror/view';
import { act, cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RuntimeThemeContext } from '@/core/runtime-theme-context';
import type { RuntimeTheme } from '@/core/runtime-preferences';

import { YamlCodeEditor, type YamlCodeEditorHandle } from './yaml-code-editor';

describe('YamlCodeEditor', () => {
  afterEach(cleanup);

  it('uses CodeMirror for editable YAML and emits the next document', () => {
    const onChange = vi.fn();
    renderEditor('dark', <YamlCodeEditor ariaLabel="Draft YAML" value="app: mysql" onChange={onChange} />);

    const textbox = screen.getByRole('textbox', { name: 'Draft YAML' });
    const editor = textbox.closest('[data-hb-yaml-editor="codemirror"]');
    expect(editor).toHaveAttribute('data-editor-theme', 'dark');
    expect(textbox).toHaveAttribute('contenteditable', 'true');

    const view = EditorView.findFromDOM(textbox);
    act(() => view?.dispatch({ changes: { from: view.state.doc.length, insert: '\nname: changed' } }));
    expect(onChange).toHaveBeenCalledWith('app: mysql\nname: changed');
  });

  it('keeps authoritative YAML read-only and follows the light runtime theme', () => {
    renderEditor('default', <YamlCodeEditor ariaLabel="Authoritative YAML" value="app: mysql" readOnly />);

    const textbox = screen.getByRole('textbox', { name: 'Authoritative YAML' });
    expect(textbox).toHaveAttribute('contenteditable', 'false');
    expect(textbox.closest('[data-hb-yaml-editor="codemirror"]')).toHaveAttribute('data-editor-theme', 'light');
  });

  it('reports viewport scrolling and accepts a synchronized peer position', () => {
    const editorRef = createRef<YamlCodeEditorHandle>();
    const onScrollPositionChange = vi.fn();
    renderEditor(
      'default',
      <YamlCodeEditor
        ref={editorRef}
        ariaLabel="Current version"
        value={'app: mysql\nname: source'}
        readOnly
        onScrollPositionChange={onScrollPositionChange}
      />
    );

    const textbox = screen.getByRole('textbox', { name: 'Current version' });
    const view = EditorView.findFromDOM(textbox)!;
    act(() => {
      view.scrollDOM.scrollTop = 84;
      view.scrollDOM.scrollLeft = 12;
      view.scrollDOM.dispatchEvent(new Event('scroll'));
    });
    expect(onScrollPositionChange).toHaveBeenLastCalledWith({ top: 84, left: 12 });

    act(() => editorRef.current?.setScrollPosition({ top: 36, left: 4 }));
    expect(view.scrollDOM.scrollTop).toBe(36);
    expect(view.scrollDOM.scrollLeft).toBe(4);
  });
});

function renderEditor(theme: RuntimeTheme, editor: React.ReactNode) {
  return render(
    <RuntimeThemeContext.Provider value={{ theme, setTheme: vi.fn() }}>{editor}</RuntimeThemeContext.Provider>
  );
}
