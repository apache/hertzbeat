/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  autocompletion,
  snippetCompletion,
  startCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult
} from '@codemirror/autocomplete';
import { history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { PostgreSQL, sql } from '@codemirror/lang-sql';
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { linter } from '@codemirror/lint';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  alertRuleLogTableColumns,
  alertRuleLogTableName,
  getAlertRuleSqlCompletions,
  validateAlertRuleSql
} from '../model/alert-rule-sql';
import styles from './alert-rule-sql-editor.module.css';

type AlertRuleSqlEditorProps = {
  ariaLabel: string;
  disabled: boolean;
  invalid: boolean;
  value: string;
  onChange: (value: string) => void;
};

export function AlertRuleSqlEditor({ ariaLabel, disabled, invalid, value, onChange }: AlertRuleSqlEditorProps) {
  const { t } = useTranslation();
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView>(null);
  const valueRef = useLatestValue(value);
  const onChangeRef = useLatestValue(onChange);
  const translationRef = useLatestValue(t);
  const externalUpdateRef = useRef(false);
  const [editableCompartment] = useState(() => new Compartment());
  const [attributesCompartment] = useState(() => new Compartment());

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: valueRef.current,
        extensions: [
          sql({
            dialect: PostgreSQL,
            schema: { [alertRuleLogTableName]: alertRuleLogTableColumns.map(column => column.name) }
          }),
          lineNumbers(),
          history(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          autocompletion({
            activateOnTyping: true,
            maxRenderedOptions: 8,
            override: [alertRuleSqlCompletionSource]
          }),
          linter(
            view =>
              validateAlertRuleSql(view.state.doc.toString()).map(code => ({
                from: 0,
                to: Math.max(1, view.state.doc.length),
                severity: 'error',
                message: translationRef.current(`alertRules.query.sqlValidation.${code}`)
              })),
            { delay: 500 }
          ),
          EditorView.lineWrapping,
          EditorState.tabSize.of(2),
          editableCompartment.of(editorEditableExtensions(false)),
          attributesCompartment.of(editorContentAttributes('', false)),
          EditorView.inputHandler.of((view, _from, _to, text, insert) => {
            if (!/^[ .,(\n]$/.test(text)) return false;
            view.dispatch(insert());
            queueMicrotask(() => {
              if (view.dom.isConnected) startCompletion(view);
            });
            return true;
          }),
          keymap.of([...historyKeymap, indentWithTab]),
          EditorView.updateListener.of(update => {
            if (!update.docChanged) return;
            if (!externalUpdateRef.current) onChangeRef.current(update.state.doc.toString());
          })
        ]
      })
    });
    viewRef.current = view;
    return () => {
      viewRef.current = null;
      view.destroy();
    };
  }, [attributesCompartment, editableCompartment, onChangeRef, translationRef, valueRef]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: [
        editableCompartment.reconfigure(editorEditableExtensions(disabled)),
        attributesCompartment.reconfigure(editorContentAttributes(ariaLabel, invalid))
      ]
    });
  }, [ariaLabel, attributesCompartment, disabled, editableCompartment, invalid]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;
    externalUpdateRef.current = true;
    try {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    } finally {
      externalUpdateRef.current = false;
    }
  }, [value]);

  return <div ref={hostRef} className={styles.editor} data-hb-alert-sql-editor="codemirror" />;
}

function editorEditableExtensions(disabled: boolean) {
  return [EditorState.readOnly.of(disabled), EditorView.editable.of(!disabled)];
}

function editorContentAttributes(ariaLabel: string, invalid: boolean) {
  return EditorView.contentAttributes.of({ 'aria-invalid': String(invalid), 'aria-label': ariaLabel });
}

function alertRuleSqlCompletionSource(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/\w*/);
  if (!word) return null;
  const textBeforeCursor = context.state.sliceDoc(0, context.pos);
  const triggeredBySourceCharacter = /[\s.,(\n]$/.test(textBeforeCursor);
  if (!context.explicit && word.from === word.to && !triggeredBySourceCharacter) return null;
  const options = getAlertRuleSqlCompletions(textBeforeCursor).map<Completion>((completion, index) => {
    const option: Completion = {
      label: completion.label,
      detail: completion.detail,
      type: completion.kind,
      apply: completion.insertText,
      boost: 1000 - index
    };
    return completion.snippet ? snippetCompletion(completion.insertText, option) : option;
  });
  return { from: word.from, options, validFor: /^\w*$/ };
}

function useLatestValue<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
