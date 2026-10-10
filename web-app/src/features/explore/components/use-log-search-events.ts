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

import { useRef } from 'react';
import type { EditorView, ViewUpdate } from '@codemirror/view';
import type { LogSearchSuggestions } from '../model/explore-log-search-authoring';
import { queryTokens } from './log-search-token-scanner';

type CompletionState = {
  open: boolean;
  selected: number;
  options: LogSearchSuggestions['options'];
  accept: (index: number) => void;
  structured: boolean;
};
type Props = {
  view: React.RefObject<EditorView | null>;
  current: React.MutableRefObject<CompletionState>;
  onChange: (value: string) => void;
  onSubmit: (() => void) | undefined;
  onBlurSubmit: boolean | undefined;
  setCaret: (caret: number) => void;
  setOpen: (open: boolean) => void;
  setSelected: React.Dispatch<React.SetStateAction<number>>;
};

export function useLogSearchEvents({
  view,
  current,
  onChange,
  onSubmit,
  onBlurSubmit,
  setCaret,
  setOpen,
  setSelected
}: Props) {
  const composing = useRef(false);
  const lastEnterSubmittedValue = useRef<string | null>(null);
  return {
    onUpdate: (update: ViewUpdate, external = false) => {
      if (update.docChanged && !external) {
        lastEnterSubmittedValue.current = null;
        onChange(update.state.doc.toString());
        setOpen(true);
        setSelected(-1);
      }
      if (update.selectionSet || update.docChanged) setCaret(update.state.selection.main.head);
    },
    onBlur: (event?: FocusEvent) => {
      setOpen(false);
      const wasComposing = composing.current || Boolean(view.current?.composing);
      composing.current = false;
      const submittedOnEnter = view.current?.state.doc.toString() === lastEnterSubmittedValue.current;
      submitOnBlur(view.current, event, onBlurSubmit, wasComposing || submittedOnEnter);
    },
    onCompositionStart: () => {
      composing.current = true;
    },
    onCompositionEnd: () => {
      composing.current = false;
    },
    onKeyDown: (event: KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229) return;
      const state = current.current;
      if (event.key === 'Enter') {
        event.preventDefault();
        if (state.structured && state.open && state.selected >= 0) state.accept(state.selected);
        else {
          if (view.current) lastEnterSubmittedValue.current = view.current.state.doc.toString();
          submitSearch(view.current, onSubmit);
        }
        return;
      }
      if (state.structured) navigateSuggestions(event, state.options.length, setOpen, setSelected);
    }
  };
}
function submitOnBlur(
  editor: EditorView | null,
  event: FocusEvent | undefined,
  enabled: boolean | undefined,
  composing: boolean
) {
  if (!editor || editor.composing || composing || !enabled || focusStaysInCommand(editor.dom, event)) return;
  const query = editor.state.doc.toString().trim();
  const last = queryTokens(query).at(-1);
  if (query && (!last || last.end !== query.length || !last.removable)) return;
  editor.dom.closest('form')?.requestSubmit();
}
function focusStaysInCommand(editor: HTMLElement, event: FocusEvent | undefined) {
  const target = event?.relatedTarget;
  return (
    (target instanceof Node && editor.closest('[data-log-command-fields]')?.contains(target)) ||
    (target instanceof Element && Boolean(target.closest('[data-log-command-skip-submit]')))
  );
}
function submitSearch(view: EditorView | null, onSubmit: (() => void) | undefined) {
  if (onSubmit) onSubmit();
  else view?.dom.closest('form')?.requestSubmit();
}
function navigateSuggestions(
  event: KeyboardEvent,
  count: number,
  setOpen: (open: boolean) => void,
  setSelected: React.Dispatch<React.SetStateAction<number>>
) {
  if (event.key === 'Escape') {
    event.preventDefault();
    setOpen(false);
    setSelected(-1);
  }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  event.preventDefault();
  setOpen(true);
  setSelected(index => {
    if (!count) return -1;
    if (index < 0) return event.key === 'ArrowDown' ? 0 : count - 1;
    return (index + (event.key === 'ArrowDown' ? 1 : -1) + count) % count;
  });
}
