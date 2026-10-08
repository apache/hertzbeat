/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { MutableRefObject } from 'react';
import { defaultKeymap, deleteCharBackward, deleteCharForward, isolateHistory } from '@codemirror/commands';
import { StateEffect, StateField, Transaction } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { invalidLogSearchSubmitEvent } from './log-search-focus-intent';
import type { useLogSearchInput } from './use-log-search-input';
import { queryTokens, tokenRemovalRange } from './log-search-token-scanner';
import { isStructuredLogSyntax } from '../model/explore-log-structured-syntax';

type EditingToken = { from: number; end: number } | null;
const commitToken = StateEffect.define<void>();
const activateToken = StateEffect.define<NonNullable<EditingToken>>();

export const activeTokenField = StateField.define<EditingToken>({
  create: () => null,
  update: updatedActiveToken
});

function updatedActiveToken(active: EditingToken, tr: Transaction): EditingToken {
  if (tr.effects.some(effect => effect.is(commitToken))) return null;
  const activated = tr.effects.find(effect => effect.is(activateToken));
  if (activated) return activated.value;
  if (clearsActiveToken(tr)) return null;
  if (!tr.docChanged && !tr.selection) return active;
  return tokenAtCurrentHead(active, tr);
}

function tokenAtCurrentHead(active: EditingToken, tr: Transaction): EditingToken {
  const head = tr.state.selection.main.head;
  const token = queryTokens(tr.state.doc.toString()).find(item => item.from < head && head <= item.end);
  if (!token) return null;
  if (!tr.docChanged) return head < token.end || active?.from === token.from ? token : null;
  return changedWithinToken(tr, token) || active?.from === token.from ? token : null;
}

function clearsActiveToken(tr: Transaction) {
  return tr.annotation(Transaction.addToHistory) === false || tr.isUserEvent('undo') || tr.isUserEvent('redo');
}

function changedWithinToken(tr: Transaction, token: NonNullable<EditingToken>) {
  let changed = false;
  tr.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
    if ((token.from <= fromB && fromB < token.end) || (fromB <= token.from && token.from < toB)) changed = true;
  });
  return changed;
}

const commitTokenEffect = commitToken;
const activateTokenEffect = activateToken;

export function tokenInputExtensions(syntaxRef: MutableRefObject<string | undefined>) {
  return [activeTokenField, separateCommittedTokenInput(syntaxRef), separateCommittedTokenPaste(syntaxRef)];
}

function separateCommittedTokenInput(syntaxRef: MutableRefObject<string | undefined>) {
  return EditorView.inputHandler.of((view, from, to, text) =>
    insertNewTokenDraft(view, from, to, text, syntaxRef.current)
  );
}

function separateCommittedTokenPaste(syntaxRef: MutableRefObject<string | undefined>) {
  return EditorView.clipboardInputFilter.of((text, state) => {
    if (!isStructuredLogSyntax(syntaxRef.current) || !state.selection.main.empty || !text || /^\s/u.test(text))
      return text;
    const head = state.selection.main.head;
    const token = queryTokens(state.doc.toString()).find(item => item.end === head && item.removable);
    const active = state.field(activeTokenField);
    return token && active?.from !== token.from ? ` ${text}` : text;
  });
}

function insertNewTokenDraft(view: EditorView, from: number, to: number, text: string, syntax = 'structured-v1') {
  if (!isStructuredLogSyntax(syntax) || view.composing || from !== to || !text || /^\s/u.test(text)) return false;
  const token = queryTokens(view.state.doc.toString()).find(item => item.end === from && item.removable);
  const active = view.state.field(activeTokenField);
  if (!token || active?.from === token.from) return false;
  view.dispatch({
    changes: { from, insert: ` ${text}` },
    selection: { anchor: from + text.length + 1 },
    effects: activateTokenEffect.of({ from: from + 1, end: from + text.length + 1 }),
    annotations: Transaction.userEvent.of('input.type')
  });
  return true;
}

export function tokenBackspaceKeymap(syntaxRef: MutableRefObject<string | undefined>) {
  return keymap.of([
    {
      key: 'Backspace',
      run: view => !view.composing && (removePreviousToken(view, syntaxRef.current) || deleteCharBackward(view))
    },
    {
      key: 'Delete',
      run: view => !view.composing && (removeNextToken(view, syntaxRef.current) || deleteCharForward(view))
    }
  ]);
}

export const tokenNavigationKeymap = keymap.of(
  defaultKeymap.filter(({ key }) => key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Enter' && key !== 'Escape')
);

function removePreviousToken(view: EditorView, syntax: string | undefined) {
  if (!isStructuredLogSyntax(syntax) || view.composing || !view.state.selection.main.empty) return false;
  const head = view.state.selection.main.head;
  const token = queryTokens(view.state.doc.toString()).find(item => item.end === head && item.removable);
  const active = view.state.field(activeTokenField);
  if (!token || (active?.from === token.from && active.end === token.end)) return false;
  const range = tokenRemovalRange(view.state.doc.toString(), token);
  view.dispatch({
    changes: { from: range.from, to: range.to },
    selection: { anchor: range.from },
    annotations: isolateHistory.of('full')
  });
  return true;
}

function removeNextToken(view: EditorView, syntax: string | undefined) {
  if (!isStructuredLogSyntax(syntax) || !view.state.selection.main.empty) return false;
  const head = view.state.selection.main.head;
  const token = queryTokens(view.state.doc.toString()).find(item => item.from === head && item.removable);
  const active = view.state.field(activeTokenField);
  if (!token || (active?.from === token.from && active.end === token.end)) return false;
  const range = tokenRemovalRange(view.state.doc.toString(), token);
  view.dispatch({
    changes: { from: range.from, to: range.to },
    selection: { anchor: range.from },
    annotations: isolateHistory.of('full')
  });
  return true;
}

export function tokenEditorDomHandlers(
  completionRef: MutableRefObject<ReturnType<typeof useLogSearchInput>>,
  viewRef: MutableRefObject<EditorView | null>,
  syntaxRef: MutableRefObject<string | undefined>
) {
  return EditorView.domEventHandlers({
    [invalidLogSearchSubmitEvent]: (event: Event) => {
      event.preventDefault();
      completionRef.current.onInvalidSubmit();
      return true;
    },
    compositionstart: () => {
      completionRef.current.onCompositionStart();
      const view = viewRef.current;
      if (!view || !isStructuredLogSyntax(syntaxRef.current) || !view.state.selection.main.empty) return;
      const head = view.state.selection.main.head;
      const token = queryTokens(view.state.doc.toString()).find(item => item.end === head && item.removable);
      if (!token || view.state.field(activeTokenField)?.from === token.from) return;
      view.dispatch({ changes: { from: head, insert: ' ' }, selection: { anchor: head + 1 } });
    },
    compositionend: () => completionRef.current.onCompositionEnd(),
    focus: () => completionRef.current.onFocus(),
    blur: event => {
      viewRef.current?.dispatch({ effects: commitTokenEffect.of() });
      completionRef.current.onBlur(event);
    },
    click: event => {
      const target = event.target instanceof Element ? event.target.closest('.hb-log-query-token') : null;
      const view = viewRef.current;
      if (!view || !target || !view.contentDOM.contains(target)) return false;
      const from = Number(target.getAttribute('data-token-from'));
      const token = queryTokens(view.state.doc.toString()).find(item => item.from === from);
      if (token) view.dispatch({ effects: activateTokenEffect.of({ from: token.from, end: token.end }) });
      return false;
    },
    keydown: event => {
      if (event.key === 'Enter' && !event.isComposing && event.keyCode !== 229) {
        viewRef.current?.dispatch({ effects: commitTokenEffect.of() });
      }
      completionRef.current.onKeyDown(event);
      return event.defaultPrevented;
    }
  });
}
