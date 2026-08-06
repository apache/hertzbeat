/*
 * Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements.
 */

import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting
} from '@codemirror/language';
import { yaml } from '@codemirror/lang-yaml';
import { EditorState } from '@codemirror/state';
import { EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view';
import { useEffect, useRef } from 'react';

import { useRuntimeTheme } from '@/core/runtime-theme-context';
import type { RuntimeTheme } from '@/core/runtime-preferences';

import styles from './yaml-code-editor.module.css';

type YamlCodeEditorProps = {
  ariaLabel: string;
  value: string;
  minHeight?: string;
  readOnly?: boolean;
  onChange?: ((value: string) => void) | undefined;
};

/**
 * Shared YAML editor for operator-authored definitions.
 *
 * CodeMirror owns text editing, selection, history, line numbers, folding and
 * keyboard behavior. This adapter only synchronizes the controlled React value;
 * feature pages own the authoritative/draft workflow around it.
 */
export function YamlCodeEditor({
  ariaLabel,
  value,
  minHeight = '320px',
  readOnly = false,
  onChange
}: YamlCodeEditorProps) {
  const { theme } = useRuntimeTheme();
  const hostRef = useYamlCodeMirror({ ariaLabel, onChange, readOnly, theme, value });

  return (
    <div
      ref={hostRef}
      aria-label={ariaLabel}
      className={styles.editor}
      data-editor-theme={theme === 'default' ? 'light' : 'dark'}
      data-hb-yaml-editor="codemirror"
      data-read-only={readOnly ? 'true' : 'false'}
      style={{ height: minHeight }}
    />
  );
}

function useYamlCodeMirror({
  ariaLabel,
  onChange,
  readOnly,
  theme,
  value
}: Required<Pick<YamlCodeEditorProps, 'ariaLabel' | 'readOnly' | 'value'>> &
  Pick<YamlCodeEditorProps, 'onChange'> & { theme: RuntimeTheme }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView>(null);
  const externalSyncRef = useRef(false);
  const valueRef = useLatestValue(value);
  const onChangeRef = useLatestValue(onChange);

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: valueRef.current,
        extensions: editorExtensions({
          ariaLabel,
          dark: theme !== 'default',
          onChange: nextValue => {
            if (!externalSyncRef.current) {
              onChangeRef.current?.(nextValue);
            }
          },
          readOnly
        })
      })
    });
    viewRef.current = view;

    return () => {
      viewRef.current = null;
      view.destroy();
    };
  }, [ariaLabel, onChangeRef, readOnly, theme, valueRef]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) {
      return;
    }
    externalSyncRef.current = true;
    try {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    } finally {
      externalSyncRef.current = false;
    }
  }, [value]);

  return hostRef;
}

function useLatestValue<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

function editorExtensions({
  ariaLabel,
  dark,
  onChange,
  readOnly
}: {
  ariaLabel: string;
  dark: boolean;
  onChange: (value: string) => void;
  readOnly: boolean;
}) {
  return [
    yaml(),
    lineNumbers(),
    foldGutter(),
    history(),
    indentOnInput(),
    bracketMatching(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    EditorView.lineWrapping,
    EditorState.readOnly.of(readOnly),
    EditorView.editable.of(!readOnly),
    EditorView.contentAttributes.of({ 'aria-label': ariaLabel }),
    EditorView.theme({}, { dark }),
    keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap, indentWithTab]),
    ...(readOnly ? [] : [highlightActiveLine(), highlightActiveLineGutter()]),
    EditorView.updateListener.of(update => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    })
  ];
}
