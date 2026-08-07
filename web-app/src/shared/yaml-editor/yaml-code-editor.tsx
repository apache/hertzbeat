/*
 * Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements.
 */

import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, foldGutter, foldKeymap, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { yaml } from '@codemirror/lang-yaml';
import { EditorState } from '@codemirror/state';
import { EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';

import { useRuntimeTheme } from '@/core/runtime-theme-context';
import type { RuntimeTheme } from '@/core/runtime-preferences';

import { yamlHighlightStyle } from './yaml-code-editor-highlight';
import styles from './yaml-code-editor.module.css';

type YamlCodeEditorProps = {
  ariaLabel: string;
  value: string;
  minHeight?: string;
  readOnly?: boolean;
  onChange?: ((value: string) => void) | undefined;
  onScrollPositionChange?: ((position: YamlEditorScrollPosition) => void) | undefined;
};

export type YamlEditorScrollPosition = { top: number; left: number };
export type YamlCodeEditorHandle = { setScrollPosition: (position: YamlEditorScrollPosition) => void };

/** Shared CodeMirror adapter; feature pages own the authoritative/draft workflow. */
export const YamlCodeEditor = forwardRef<YamlCodeEditorHandle, YamlCodeEditorProps>(function YamlCodeEditor(
  { ariaLabel, value, minHeight = '320px', readOnly = false, onChange, onScrollPositionChange },
  ref
) {
  const { theme } = useRuntimeTheme();
  const { hostRef, setScrollPosition } = useYamlCodeMirror({
    ariaLabel,
    onChange,
    onScrollPositionChange,
    readOnly,
    theme,
    value
  });
  useImperativeHandle(
    ref,
    () => ({
      setScrollPosition
    }),
    [setScrollPosition]
  );

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
});

function useYamlCodeMirror({
  ariaLabel,
  onChange,
  onScrollPositionChange,
  readOnly,
  theme,
  value
}: Required<Pick<YamlCodeEditorProps, 'ariaLabel' | 'readOnly' | 'value'>> &
  Pick<YamlCodeEditorProps, 'onChange' | 'onScrollPositionChange'> & { theme: RuntimeTheme }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView>(null);
  const externalSyncRef = useRef(false);
  const valueRef = useLatestValue(value);
  const onChangeRef = useLatestValue(onChange);
  const onScrollPositionChangeRef = useLatestValue(onScrollPositionChange);
  const {
    cancel: cancelPeerScroll,
    report: reportPeerScroll,
    schedule: schedulePeerScroll
  } = usePeerScroll(viewRef, onScrollPositionChangeRef);

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
    const reportScrollPosition = () => reportPeerScroll(view);
    view.scrollDOM.addEventListener('scroll', reportScrollPosition, { passive: true });

    return () => {
      view.scrollDOM.removeEventListener('scroll', reportScrollPosition);
      cancelPeerScroll();
      viewRef.current = null;
      view.destroy();
    };
  }, [ariaLabel, cancelPeerScroll, onChangeRef, readOnly, reportPeerScroll, theme, valueRef]);

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

  return { hostRef, setScrollPosition: schedulePeerScroll };
}

function usePeerScroll(
  viewRef: React.RefObject<EditorView | null>,
  onScrollPositionChangeRef: React.RefObject<YamlCodeEditorProps['onScrollPositionChange']>
) {
  const frameRef = useRef<number | null>(null);
  const pendingRef = useRef<YamlEditorScrollPosition | null>(null);
  const programmaticRef = useRef<YamlEditorScrollPosition | null>(null);
  // Comparison panes can have different scroll ranges. Coalescing drag updates
  // and suppressing the clamped peer event prevents it from pulling the source back.
  const schedule = useCallback(
    (position: YamlEditorScrollPosition) => {
      pendingRef.current = position;
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        const view = viewRef.current;
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (!view || !pending) return;
        programmaticRef.current = applyEditorScrollPosition(view, pending);
      });
    },
    [viewRef]
  );
  const report = useCallback(
    (view: EditorView) => {
      const position = readEditorScrollPosition(view);
      if (sameScrollPosition(position, programmaticRef.current)) {
        return;
      }
      programmaticRef.current = null;
      onScrollPositionChangeRef.current?.(position);
    },
    [onScrollPositionChangeRef]
  );
  const cancel = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    pendingRef.current = null;
    programmaticRef.current = null;
  }, []);
  return { cancel, report, schedule };
}

function applyEditorScrollPosition(view: EditorView, position: YamlEditorScrollPosition) {
  if (Math.abs(view.scrollDOM.scrollTop - position.top) > 0.5) view.scrollDOM.scrollTop = position.top;
  if (Math.abs(view.scrollDOM.scrollLeft - position.left) > 0.5) view.scrollDOM.scrollLeft = position.left;
  return readEditorScrollPosition(view);
}

function readEditorScrollPosition(view: EditorView): YamlEditorScrollPosition {
  return { top: view.scrollDOM.scrollTop, left: view.scrollDOM.scrollLeft };
}

function sameScrollPosition(left: YamlEditorScrollPosition, right: YamlEditorScrollPosition | null) {
  return Boolean(right && Math.abs(left.top - right.top) <= 0.5 && Math.abs(left.left - right.left) <= 0.5);
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
    syntaxHighlighting(yamlHighlightStyle, { fallback: true }),
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
