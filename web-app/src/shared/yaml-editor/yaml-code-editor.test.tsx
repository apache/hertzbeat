/*
 * Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements.
 */

// @vitest-environment jsdom

import { EditorView } from '@codemirror/view';
import { act, cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import appStyles from '@/app/styles.css?raw';
import { RuntimeThemeContext } from '@/core/runtime-theme-context';
import type { RuntimeTheme } from '@/core/runtime-preferences';

import editorSource from './yaml-code-editor.tsx?raw';
import { YamlCodeEditor, type YamlCodeEditorHandle } from './yaml-code-editor';

describe('YamlCodeEditor', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

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

  it('coalesces peer scrolling, suppresses its clamped echo, and keeps later user scrolling observable', () => {
    const frames: Array<{ callback: FrameRequestCallback; id: number }> = [];
    let nextFrameId = 0;
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      const id = ++nextFrameId;
      frames.push({ callback, id });
      return id;
    });
    const cancelAnimationFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);
    const editorRef = createRef<YamlCodeEditorHandle>();
    const onScrollPositionChange = vi.fn();
    const editor = renderEditor(
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
    let top = 0;
    Object.defineProperty(view.scrollDOM, 'scrollTop', {
      configurable: true,
      get: () => top,
      set: value => {
        top = Math.min(Number(value), 40);
      }
    });
    act(() => {
      view.scrollDOM.scrollTop = 84;
      view.scrollDOM.scrollLeft = 12;
      view.scrollDOM.dispatchEvent(new Event('scroll'));
    });
    expect(onScrollPositionChange).toHaveBeenLastCalledWith({ top: 40, left: 12 });
    onScrollPositionChange.mockClear();
    frames.length = 0;
    requestAnimationFrame.mockClear();
    cancelAnimationFrame.mockClear();

    act(() => {
      editorRef.current?.setScrollPosition({ top: 84, left: 2 });
      editorRef.current?.setScrollPosition({ top: 72, left: 4 });
    });
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    expect(view.scrollDOM.scrollTop).toBe(40);
    act(() => frames.shift()?.callback(0));
    expect(view.scrollDOM.scrollTop).toBe(40);
    expect(view.scrollDOM.scrollLeft).toBe(4);
    act(() => {
      view.scrollDOM.dispatchEvent(new Event('scroll'));
    });
    expect(onScrollPositionChange).not.toHaveBeenCalled();

    act(() => {
      view.scrollDOM.scrollTop = 20;
      view.scrollDOM.dispatchEvent(new Event('scroll'));
    });
    expect(onScrollPositionChange).toHaveBeenLastCalledWith({ top: 20, left: 4 });

    frames.length = 0;
    requestAnimationFrame.mockClear();
    cancelAnimationFrame.mockClear();
    act(() => editorRef.current?.setScrollPosition({ top: 30, left: 0 }));
    const pendingFrameId = frames[0]!.id;
    editor.unmount();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(pendingFrameId);
  });

  it('uses semantic YAML syntax tokens supplied by both runtime palettes', () => {
    expect(editorSource).toContain('HighlightStyle');
    expect(editorSource).toContain('tags.propertyName');
    expect(editorSource).toContain('tags.string');
    expect(editorSource).toContain('tags.number');
    expect(editorSource).toContain('tags.atom');
    expect(editorSource).toContain('tags.punctuation');
    expect(editorSource).toContain('tags.comment');
    for (const token of ['property', 'string', 'number', 'atom', 'punctuation', 'comment']) {
      expect(appStyles).toMatch(new RegExp(`:root\\s*\\{[^}]*--hb-syntax-${token}:`, 's'));
      expect(appStyles).toMatch(new RegExp(`:root\\[data-theme='default'\\]\\s*\\{[^}]*--hb-syntax-${token}:`, 's'));
    }
  });
});

function renderEditor(theme: RuntimeTheme, editor: React.ReactNode) {
  return render(
    <RuntimeThemeContext.Provider value={{ theme, setTheme: vi.fn() }}>{editor}</RuntimeThemeContext.Provider>
  );
}
