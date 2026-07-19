/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useRef, useState } from 'react';

import type { LabelEditorState } from '../components/label-editor';
import type { LabelRecord } from '../model/label-model';

type LabelEditorMutations = {
  createLabel: (values: Partial<LabelRecord>, onConfirmed: () => void) => boolean;
  isLocked: () => boolean;
  updateLabel: (record: LabelRecord, values: Partial<LabelRecord>, onConfirmed: () => void) => boolean;
};

/** Owns editor identity so an old mutation callback cannot close a newer dialog. */
export function useLabelEditorController(mutations: LabelEditorMutations) {
  const [editor, setEditor] = useState<LabelEditorState>();
  const editorRef = useRef<LabelEditorState | undefined>(undefined);
  const publish = (next: LabelEditorState | undefined) => {
    editorRef.current = next;
    setEditor(next);
  };
  const create = () => {
    if (mutations.isLocked()) return false;
    publish({ value: {}, isNew: true });
    return true;
  };
  const edit = (record: LabelRecord) => {
    if (mutations.isLocked()) return false;
    publish({ value: { ...record }, isNew: false });
    return true;
  };
  const close = () => {
    if (mutations.isLocked()) return false;
    publish(undefined);
    return true;
  };
  const submit = (values: Partial<LabelRecord>) => {
    const submitted = editorRef.current;
    if (!submitted || mutations.isLocked()) return false;
    const closeSubmittedEditor = () => {
      if (editorRef.current === submitted) publish(undefined);
    };
    return submitted.isNew
      ? mutations.createLabel(values, closeSubmittedEditor)
      : mutations.updateLabel(submitted.value, values, closeSubmittedEditor);
  };
  return { actions: { close, create, edit, submit }, state: { editor } };
}
