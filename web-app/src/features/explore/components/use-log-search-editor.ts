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

import { useEffect, useLayoutEffect, useRef, type MutableRefObject } from 'react';
import { history, historyKeymap } from '@codemirror/commands';
import { Compartment, EditorState, Transaction } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import type { TFunction } from 'i18next';
import type { useLogSearchInput } from './use-log-search-input';
import { tokenDecorations } from './log-search-token-decorations';
import { isStructuredLogSyntax } from '../model/explore-log-structured-syntax';
import {
  tokenBackspaceKeymap,
  tokenEditorDomHandlers,
  tokenInputExtensions,
  tokenNavigationKeymap
} from './log-search-token-editing';

type Props = {
  invalid?: boolean | undefined;
  errorId?: string | undefined;
  value: string;
  syntax: string | undefined;
  suggestedService?: string | undefined;
  t: TFunction;
  viewRef: MutableRefObject<EditorView | null>;
  completion: ReturnType<typeof useLogSearchInput>;
};
export function useLogSearchEditor({
  value,
  syntax,
  suggestedService,
  t,
  viewRef,
  completion,
  invalid,
  errorId
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const tokenCompartment = useRef(new Compartment());
  const placeholderCompartment = useRef(new Compartment());
  const externalUpdate = useRef(false);
  const removeLabel = t('explore.logAuthoring.removeToken');
  const example = suggestedService ? `service:${JSON.stringify(suggestedService)}` : t('explore.logAuthoring.example');
  const placeholderText = isStructuredLogSyntax(syntax)
    ? t('explore.logAuthoring.exampleHint', { example })
    : t('explore.queryPlaceholders.logs');
  const completionRef = useRef(completion);
  useLayoutEffect(() => {
    completionRef.current = completion;
  });
  useMountedEditor(
    host,
    viewRef,
    value,
    syntax,
    t('explore.queryLabels.logs'),
    removeLabel,
    tokenCompartment,
    placeholderCompartment,
    externalUpdate,
    completionRef
  );
  useEffect(() => {
    const editor = viewRef.current;
    if (!editor) return;
    editor.dispatch({
      effects: tokenCompartment.current.reconfigure(
        isStructuredLogSyntax(syntax) ? tokenDecorations(removeLabel, () => completionRef.current.close()) : []
      )
    });
  }, [syntax, removeLabel, viewRef]);
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: placeholderCompartment.current.reconfigure(placeholder(placeholderText))
    });
  }, [placeholderText, viewRef]);
  useSyncedValue(value, viewRef, externalUpdate);
  useEditorAccessibility({ completion, syntax, t, viewRef, invalid, errorId });
  return host;
}

function useEditorAccessibility({
  completion,
  syntax,
  t,
  viewRef,
  invalid,
  errorId
}: Pick<Props, 'completion' | 'syntax' | 't' | 'viewRef' | 'invalid' | 'errorId'>) {
  const { id, options, selected } = completion;
  useEffect(() => {
    const editor = viewRef.current;
    if (!editor) return;
    editor.contentDOM.setAttribute('aria-label', t('explore.queryLabels.logs'));
    editor.contentDOM.setAttribute('aria-expanded', String(completion.open));
    editor.contentDOM.setAttribute('aria-controls', id);
    if (selected >= 0 && options[selected])
      editor.contentDOM.setAttribute('aria-activedescendant', `${id}-${selected}`);
    else editor.contentDOM.removeAttribute('aria-activedescendant');
    if (invalid) editor.contentDOM.setAttribute('aria-invalid', 'true');
    else editor.contentDOM.removeAttribute('aria-invalid');
    if (invalid && errorId) editor.contentDOM.setAttribute('aria-describedby', errorId);
    else editor.contentDOM.removeAttribute('aria-describedby');
    editor.contentDOM.setAttribute('data-log-search-input', '');
    editor.contentDOM.setAttribute('data-log-search-syntax', syntax || 'literal');
  }, [completion.open, id, options, selected, syntax, t, viewRef, invalid, errorId]);
}

function useSyncedValue(
  value: string,
  viewRef: MutableRefObject<EditorView | null>,
  externalRef: MutableRefObject<boolean>
) {
  useEffect(() => {
    const editor = viewRef.current;
    if (!editor || editor.state.doc.toString() === value) return;
    const old = editor.state.doc.toString();
    let start = 0;
    while (start < old.length && start < value.length && old[start] === value[start]) start++;
    let oldEnd = old.length;
    let newEnd = value.length;
    while (oldEnd > start && newEnd > start && old[oldEnd - 1] === value[newEnd - 1]) {
      oldEnd--;
      newEnd--;
    }
    externalRef.current = true;
    try {
      editor.dispatch({
        changes: { from: start, to: oldEnd, insert: value.slice(start, newEnd) },
        annotations: Transaction.addToHistory.of(false)
      });
    } finally {
      externalRef.current = false;
    }
  }, [value, viewRef, externalRef]);
}

function useMountedEditor(
  hostRef: MutableRefObject<HTMLDivElement | null>,
  viewRef: MutableRefObject<EditorView | null>,
  value: string,
  syntax: string | undefined,
  label: string,
  removeLabel: string,
  compartmentRef: MutableRefObject<Compartment>,
  placeholderRef: MutableRefObject<Compartment>,
  externalRef: MutableRefObject<boolean>,
  completionRef: MutableRefObject<ReturnType<typeof useLogSearchInput>>
) {
  const initialValue = useRef(value);
  const initialSyntax = useRef(syntax);
  const initialLabel = useRef(label);
  const initialRemoveLabel = useRef(removeLabel);
  useLayoutEffect(() => {
    initialSyntax.current = syntax;
  }, [syntax]);
  useEffect(() => {
    if (!hostRef.current) return;
    const editor = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: initialValue.current,
        extensions: [
          history(),
          ...tokenInputExtensions(initialSyntax),
          tokenBackspaceKeymap(initialSyntax),
          keymap.of(historyKeymap),
          tokenNavigationKeymap,
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({
            'aria-label': initialLabel.current,
            role: 'combobox',
            'aria-autocomplete': 'list'
          }),
          EditorView.updateListener.of(update => {
            completionRef.current.onUpdate(update, externalRef.current);
          }),
          tokenEditorDomHandlers(completionRef, viewRef, initialSyntax),
          compartmentRef.current.of(
            isStructuredLogSyntax(initialSyntax.current)
              ? tokenDecorations(initialRemoveLabel.current, () => completionRef.current.close())
              : []
          ),
          placeholderRef.current.of(placeholder(''))
        ]
      })
    });
    viewRef.current = editor;
    return () => {
      viewRef.current = null;
      editor.destroy();
    };
  }, [hostRef, viewRef, compartmentRef, placeholderRef, externalRef, completionRef]);
}
