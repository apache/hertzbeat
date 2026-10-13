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

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { isolateHistory } from '@codemirror/commands';
import type { EditorView } from '@codemirror/view';
import {
  insertSearchCompletion,
  searchCompletionContext,
  type LogSearchSuggestions
} from '../model/explore-log-search-authoring';
import { isStructuredLogSyntax } from '../model/explore-log-structured-syntax';
import { useLogSearchEvents } from './use-log-search-events';

type Props = {
  value: string;
  syntax: string | undefined;
  onChange: (value: string) => void;
  onSubmit?: (() => void) | undefined;
  onBlurSubmit?: boolean | undefined;
  suggestions?: LogSearchSuggestions | undefined;
};
export function useLogSearchInput(
  { value, syntax, onChange, suggestions, onSubmit, onBlurSubmit }: Props,
  view: React.RefObject<EditorView | null>
) {
  const [open, setOpen] = useState(false);
  const [caret, setCaret] = useState(value.length);
  const [selected, setSelected] = useState(-1);
  const submitFocus = useInvalidSubmitCompletionFocus(view, setOpen, setSelected);
  const id = useId();
  const structured = isStructuredLogSyntax(syntax);
  const context = searchCompletionContext(value, caret);
  const options = matchingOptions(suggestions, context);
  const requestField = suggestions?.requestField;
  useEffect(() => {
    if (!structured || context?.field) requestField?.(structured ? context?.field : undefined);
    else requestField?.(undefined, context?.prefix);
  }, [requestField, structured, context?.field, context?.prefix]);

  const accept = (index: number) => {
    const editor = view.current;
    if (!editor || !context || !options[index]) return;
    const option = options[index];
    const nextCaret = applyCompletion(editor, value, context, option);
    setCaret(nextCaret);
    setSelected(-1);
    setOpen(!option.fieldValue);
    editor.focus();
  };
  const current = useRef({ open, selected, options, accept, structured });
  useLayoutEffect(() => {
    current.current = { open, selected, options, accept, structured };
  });
  const events = useLogSearchEvents({
    view,
    current,
    onChange,
    onSubmit,
    onBlurSubmit,
    setCaret,
    setOpen,
    setSelected
  });
  return {
    open: structured && open,
    id,
    selected,
    options,
    prefix: context?.prefix ?? '',
    accept,
    close: () => setOpen(false),
    ...submitFocus,
    ...events
  };
}
function applyCompletion(
  editor: EditorView,
  value: string,
  context: NonNullable<ReturnType<typeof searchCompletionContext>>,
  option: NonNullable<LogSearchSuggestions['options'][number]>
) {
  const next = insertSearchCompletion(value, context, option.value, option.fieldValue, option.insertion);
  editor.dispatch({
    changes: { from: context.start, to: context.end, insert: next.text.slice(context.start, next.caret) },
    selection: { anchor: next.caret },
    annotations: isolateHistory.of('after')
  });
  return next.caret;
}
function matchingOptions(
  suggestions: LogSearchSuggestions | undefined,
  context: ReturnType<typeof searchCompletionContext>
) {
  if (!context || suggestions?.field !== context.field) return [];
  return (suggestions?.options ?? [])
    .filter(
      item =>
        !/[\p{Cc}]/u.test(item.value) &&
        (item.fieldValue === Boolean(context.field) || (item.insertion !== undefined && !context.field)) &&
        (item.condition ?? item.label).toLowerCase().includes(context.prefix.toLowerCase())
    )
    .slice(0, 20);
}

/** Suppress only the focus event caused synchronously by a rejected explicit submit. */
function useInvalidSubmitCompletionFocus(
  view: React.RefObject<EditorView | null>,
  setOpen: (open: boolean) => void,
  setSelected: (selected: number) => void
) {
  const focusingInvalidSubmit = useRef(false);
  return {
    onInvalidSubmit: () => {
      setOpen(false);
      setSelected(-1);
      focusingInvalidSubmit.current = true;
      try {
        view.current?.focus();
      } finally {
        focusingInvalidSubmit.current = false;
      }
    },
    onFocus: () => {
      if (focusingInvalidSubmit.current) return;
      setOpen(true);
      setSelected(-1);
    }
  };
}
