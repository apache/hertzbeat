/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { EditorView } from '@codemirror/view';
import type { LogSyntaxDiagnostic } from '../model/explore-log-filter-failure';
export const STRUCTURED_LOG_INPUT_SELECTOR =
  ':is([data-log-search-syntax="structured-v1"], [data-log-search-syntax="structured-v2"]) [data-log-search-input]';

export function focusLogSyntaxDiagnostic(
  region: HTMLElement | null,
  diagnostic: LogSyntaxDiagnostic | undefined,
  source: 'a' | 'b' = 'a'
) {
  if (!diagnostic) return false;
  const input = region
    ?.closest('[data-explore-query-layout]')
    ?.querySelector<HTMLElement>(`[data-log-comparison-source="${source}"] ${STRUCTURED_LOG_INPUT_SELECTOR}`);
  const editor = input && EditorView.findFromDOM(input);
  if (!editor || editor.state.doc.toString() !== diagnostic.expression) return false;
  editor.focus();
  editor.dispatch({ selection: { anchor: diagnostic.start, head: diagnostic.end } });
  return true;
}
