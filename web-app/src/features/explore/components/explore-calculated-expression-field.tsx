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

import { useEffect, useRef } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, isolateHistory } from '@codemirror/commands';
import type { TFunction } from 'i18next';
import { ExploreCalculatedFunctionPicker } from './explore-calculated-function-picker';
import styles from './explore-log-transaction-editor.module.css';

export function ExploreCalculatedExpressionField({
  value,
  onChange,
  t
}: {
  value: string;
  onChange: (value: string) => void;
  t: TFunction;
}) {
  const view = useRef<EditorView | null>(null);
  const focused = useRef(false);
  return (
    <div>
      <div className={styles.expressionHeading}>
        <span>{t('explore.logCalculatedV2.expression')}</span>
        <ExploreCalculatedFunctionPicker t={t} insert={name => insertFunction(view.current, focused.current, name)} />
      </div>
      <CalculatedExpressionEditor
        value={value}
        onChange={onChange}
        label={t('explore.logCalculatedV2.expression')}
        viewRef={view}
        focused={focused}
      />
    </div>
  );
}

function insertFunction(view: EditorView | null, focused: boolean, name: string) {
  if (!view) return;
  const selection = focused ? view.state.selection.main : null;
  const from = selection?.from ?? view.state.doc.length;
  const to = selection?.to ?? from;
  const before = view.state.doc.sliceString(Math.max(0, from - 1), from);
  const after = view.state.doc.sliceString(to, Math.min(view.state.doc.length, to + 1));
  const prefix = from > 0 && !/\s/.test(before) ? ' ' : '';
  const suffix = after && !/\s/.test(after) ? ' ' : '';
  view.dispatch({
    changes: { from, to, insert: `${prefix}${name}()${suffix}` },
    selection: { anchor: from + prefix.length + name.length + 1 },
    annotations: isolateHistory.of('full')
  });
  view.focus();
}

function CalculatedExpressionEditor({
  value,
  onChange,
  label,
  viewRef,
  focused
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  viewRef: { current: EditorView | null };
  focused: { current: boolean };
}) {
  const host = useRef<HTMLDivElement>(null);
  const initial = useRef(value);
  const change = useRef(onChange);
  useEffect(() => {
    change.current = onChange;
  }, [onChange]);
  useEffect(() => {
    if (!host.current) return;
    const editor = new EditorView({
      parent: host.current,
      doc: initial.current,
      extensions: [
        EditorView.lineWrapping,
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.contentAttributes.of({ 'aria-label': label, role: 'textbox' }),
        EditorView.domEventHandlers({
          focus: () => {
            focused.current = true;
          }
        }),
        EditorView.updateListener.of(update => {
          if (update.docChanged) change.current(update.state.doc.toString());
        })
      ]
    });
    viewRef.current = editor;
    return () => {
      viewRef.current = null;
      editor.destroy();
    };
  }, [label, focused, viewRef]);
  return <div ref={host} className={styles.expressionEditor} data-calculated-expression-editor="codemirror" />;
}
