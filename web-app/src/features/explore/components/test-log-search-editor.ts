/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { act } from '@testing-library/react';
import { EditorView } from '@codemirror/view';

export function logSearchView(element: HTMLElement) {
  const view = EditorView.findFromDOM(element);
  if (!view) throw new Error('Expected a CodeMirror log search editor');
  return view;
}

export function setLogSearchText(element: HTMLElement, text: string) {
  const view = logSearchView(element);
  act(() =>
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
      selection: { anchor: text.length }
    })
  );
}

export function logSearchText(element: HTMLElement) {
  return logSearchView(element).state.doc.toString();
}
