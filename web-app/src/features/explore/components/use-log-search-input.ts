/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { isolateHistory } from '@codemirror/commands';
import type { EditorView, ViewUpdate } from '@codemirror/view';
import {
  insertSearchCompletion,
  searchCompletionContext,
  type LogSearchSuggestions
} from '../model/explore-log-search-authoring';
import { isStructuredLogSyntax } from '../model/explore-log-structured-syntax';
import { queryTokens } from './log-search-token-scanner';

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
  const composing = useRef(false);
  const submitFocus = useInvalidSubmitCompletionFocus(view, setOpen, setSelected);
  const lastEnterSubmittedValue = useRef<string | null>(null);
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
  return {
    open: structured && open,
    id,
    selected,
    options,
    prefix: context?.prefix ?? '',
    accept,
    close: () => setOpen(false),
    onUpdate: (update: ViewUpdate, external = false) => {
      if (update.docChanged && !external) {
        lastEnterSubmittedValue.current = null;
        onChange(update.state.doc.toString());
        setOpen(true);
        setSelected(-1);
      }
      if (update.selectionSet || update.docChanged) setCaret(update.state.selection.main.head);
    },
    ...submitFocus,
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
