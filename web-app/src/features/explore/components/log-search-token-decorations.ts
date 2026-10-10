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

import { Decoration, EditorView, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import { isolateHistory } from '@codemirror/commands';

import { queryTokens, tokenRemovalRange } from './log-search-token-scanner';
import { activeTokenField } from './log-search-token-editing';
import { logSeverityLabel } from '@/shared/log-severity';

export const tokenDecorations = (removeLabel: string, closeSuggestions: () => void) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = decorateTokens(view, removeLabel, closeSuggestions);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.startState.field(activeTokenField) !== update.state.field(activeTokenField))
          this.decorations = decorateTokens(update.view, removeLabel, closeSuggestions);
      }
    },
    { decorations: plugin => plugin.decorations }
  );
function decorateTokens(view: EditorView, removeLabel: string, closeSuggestions: () => void) {
  const text = view.state.doc.toString();
  const active = view.state.field(activeTokenField);
  const ranges = [];
  for (const { from, end } of logicalOperators(text, active))
    ranges.push(Decoration.mark({ class: 'hb-log-query-operator' }).range(from, end));
  for (const { from, end, raw, removable } of queryTokens(text)) {
    if (active?.from === from && active.end === end) continue;
    ranges.push(
      Decoration.mark({
        class: tokenClass(raw, removable),
        attributes: { 'data-token-from': String(from), 'data-token-end': String(end) }
      }).range(from, end)
    );
    const field = /^-?(?:\*|@[\w.-]+|resource\.[\w.-]+|[\w.-]+)(?:\[(?:"(?:\\.|[^"\\])*")?\])*:/u.exec(raw);
    if (field && field[0].length < raw.length) {
      ranges.push(Decoration.mark({ class: 'hb-log-query-field' }).range(from, from + field[0].length));
      ranges.push(
        Decoration.mark({ class: 'hb-log-query-punctuation' }).range(from + field[0].length - 1, from + field[0].length)
      );
    }
    if (removable)
      ranges.push(
        Decoration.widget({
          widget: new RemoveTokenWidget(from, end, raw, removeLabel, closeSuggestions),
          side: -1
        }).range(end)
      );
  }
  return Decoration.set(ranges, true);
}

function tokenClass(raw: string, removable: boolean) {
  const status = /^-?status:(?:"((?:\\.|[^"\\])*)"|([^\s()]+))$/iu.exec(raw);
  const severity = status && logSeverityLabel({ severityText: status[1] ?? status[2] ?? '' });
  const tone =
    severity && ['TRACE', 'DEBUG', 'INFO', 'WARN', 'WARNING', 'ERROR', 'FATAL'].includes(severity)
      ? severity === 'WARNING'
        ? 'warn'
        : severity.toLowerCase()
      : undefined;
  return `hb-log-query-token${removable ? ' hb-log-query-token-removable' : ''}${/:\(/u.test(raw) ? ' hb-log-query-group' : ''}${tone ? ` hb-log-query-status-${tone}` : ''}`;
}

function logicalOperators(text: string, active: { from: number; end: number } | null) {
  const operators: { from: number; end: number }[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\\') i++;
    else if (text[i] === '"') quoted = !quoted;
    else if (!quoted) {
      const end = logicalOperatorEnd(text, i, active);
      if (end) {
        operators.push({ from: i, end });
        i = end - 1;
      }
    }
  }
  return operators;
}

function logicalOperatorEnd(text: string, from: number, active: { from: number; end: number } | null) {
  const match = /^(?:AND|OR)\b/iu.exec(text.slice(from));
  if (!match || !startsLogicalOperator(text, from)) return null;
  const end = from + match[0].length;
  if ((end < text.length && !/\s|\)/u.test(text[end]!)) || (active && active.from <= from && end <= active.end))
    return null;
  return hasLogicalOperands(text, from, end) ? end : null;
}

function startsLogicalOperator(text: string, from: number) {
  return from === 0 || /\s|\(/u.test(text[from - 1]!);
}

function hasLogicalOperands(text: string, from: number, end: number) {
  let before = from - 1;
  let after = end;
  while (/\s/u.test(text[before] ?? '')) before--;
  while (/\s/u.test(text[after] ?? '')) after++;
  return /[\w"')\]]/u.test(text[before] ?? '') && (/^[\w"(@*#-]/u.test(text[after] ?? '') || text[after] === '[');
}

class RemoveTokenWidget extends WidgetType {
  constructor(
    private from: number,
    private end: number,
    private raw: string,
    private label: string,
    private closeSuggestions: () => void
  ) {
    super();
  }
  eq(other: RemoveTokenWidget) {
    return this.from === other.from && this.end === other.end && this.raw === other.raw && this.label === other.label;
  }
  toDOM(view: EditorView) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hb-log-query-remove';
    button.textContent = '×';
    button.setAttribute('aria-label', `${this.label}: ${this.raw}`);
    button.title = `${this.label}: ${this.raw}`;
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if (view.state.doc.sliceString(this.from, this.end) !== this.raw) return;
      const range = tokenRemovalRange(view.state.doc.toString(), { from: this.from, end: this.end });
      view.dispatch({
        changes: { from: range.from, to: range.to },
        selection: { anchor: range.from },
        annotations: isolateHistory.of('full')
      });
      view.focus();
      this.closeSuggestions();
    });
    button.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        view.focus();
        this.closeSuggestions();
      }
    });
    return button;
  }
}
