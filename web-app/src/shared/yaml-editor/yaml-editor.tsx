/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { yaml } from '@codemirror/lang-yaml';
import { syntaxHighlighting } from '@codemirror/language';
import { MergeView } from '@codemirror/merge';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { useEffect, useRef } from 'react';

import { useRuntimeTheme } from '@/core/runtime-theme-context';
import type { RuntimeTheme } from '@/core/runtime-preferences';

import { yamlHighlightStyle } from './yaml-editor-highlight';
import styles from './yaml-editor.module.css';

type YamlEditorProps = {
  ariaLabel: string;
  value: string;
  minHeight?: string;
  readOnly?: boolean;
  onChange?: ((value: string) => void) | undefined;
};

type YamlDiffEditorProps = {
  originalAriaLabel: string;
  modifiedAriaLabel: string;
  originalValue: string;
  modifiedValue: string;
  minHeight?: string;
  readOnly?: boolean;
  onChange?: ((value: string) => void) | undefined;
};

/** Single-document editor used while creating a monitor definition. */
export function YamlEditor({ ariaLabel, value, minHeight = '320px', readOnly = false, onChange }: YamlEditorProps) {
  const { theme } = useRuntimeTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const valueRef = useLatestValue(value);
  const onChangeRef = useLatestValue(onChange);
  const externalUpdateRef = useRef(false);

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: valueRef.current,
        extensions: editorExtensions({
          ariaLabel,
          readOnly,
          theme,
          onChange: nextValue => {
            if (!externalUpdateRef.current) onChangeRef.current?.(nextValue);
          }
        })
      })
    });
    viewRef.current = view;
    return () => {
      viewRef.current = null;
      view.destroy();
    };
  }, [ariaLabel, valueRef, onChangeRef, readOnly, theme]);

  useEffect(() => updateEditorDocument(viewRef.current, value, externalUpdateRef), [value]);

  return <div ref={hostRef} className={styles.editor} data-hb-yaml-editor="codemirror" style={{ height: minHeight }} />;
}

/**
 * CodeMirror's MergeView owns both panes, their aligned spacers, and one scroll
 * surface. This avoids the delayed feedback loop of two independently synced editors.
 */
export function YamlDiffEditor({
  originalAriaLabel,
  modifiedAriaLabel,
  originalValue,
  modifiedValue,
  minHeight = '320px',
  readOnly = false,
  onChange
}: YamlDiffEditorProps) {
  const { theme } = useRuntimeTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  const mergeRef = useRef<MergeView | null>(null);
  const originalValueRef = useLatestValue(originalValue);
  const modifiedValueRef = useLatestValue(modifiedValue);
  const onChangeRef = useLatestValue(onChange);
  const externalUpdateRef = useRef(false);

  useEffect(() => {
    if (!hostRef.current) return;
    const merge = new MergeView({
      parent: hostRef.current,
      a: {
        doc: originalValueRef.current,
        extensions: editorExtensions({ ariaLabel: originalAriaLabel, readOnly: true, theme })
      },
      b: {
        doc: modifiedValueRef.current,
        extensions: editorExtensions({
          ariaLabel: modifiedAriaLabel,
          readOnly,
          theme,
          onChange: nextValue => {
            if (!externalUpdateRef.current) onChangeRef.current?.(nextValue);
          }
        })
      },
      diffConfig: { scanLimit: 2000, timeout: 250 },
      gutter: true,
      highlightChanges: true
    });
    mergeRef.current = merge;
    return () => {
      mergeRef.current = null;
      merge.destroy();
    };
  }, [modifiedValueRef, originalValueRef, modifiedAriaLabel, onChangeRef, originalAriaLabel, readOnly, theme]);

  useEffect(() => {
    const merge = mergeRef.current;
    updateEditorDocument(merge?.a ?? null, originalValue, externalUpdateRef);
    updateEditorDocument(merge?.b ?? null, modifiedValue, externalUpdateRef);
  }, [modifiedValue, originalValue]);

  return (
    <div ref={hostRef} className={styles.editor} data-hb-yaml-editor="codemirror-merge" style={{ height: minHeight }} />
  );
}

function editorExtensions({
  ariaLabel,
  readOnly,
  theme,
  onChange
}: {
  ariaLabel: string;
  readOnly: boolean;
  theme: RuntimeTheme;
  onChange?: (value: string) => void;
}) {
  return [
    yaml(),
    lineNumbers(),
    history(),
    syntaxHighlighting(yamlHighlightStyle, { fallback: true }),
    EditorView.lineWrapping,
    EditorState.readOnly.of(readOnly),
    EditorView.editable.of(!readOnly),
    EditorView.contentAttributes.of({ 'aria-label': ariaLabel }),
    EditorView.theme({}, { dark: theme !== 'default' }),
    keymap.of([...historyKeymap, indentWithTab]),
    EditorView.updateListener.of(update => {
      if (update.docChanged) onChange?.(update.state.doc.toString());
    })
  ];
}

function updateEditorDocument(
  view: EditorView | null,
  value: string,
  externalUpdateRef: React.MutableRefObject<boolean>
) {
  if (!view || view.state.doc.toString() === value) return;
  externalUpdateRef.current = true;
  try {
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  } finally {
    externalUpdateRef.current = false;
  }
}

function useLatestValue<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
