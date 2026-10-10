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

import { useRef, useState } from 'react';

import {
  labelActionCapabilities,
  type LabelActionCapabilities,
  type LabelEditorState,
  type LabelRecord
} from '../model/label-model';

type LabelEditorMutations = {
  createLabel: (values: Partial<LabelRecord>, onConfirmed: () => void) => boolean;
  isInFlight: () => boolean;
  isLocked: () => boolean;
  updateLabel: (record: LabelRecord, values: Partial<LabelRecord>, onConfirmed: () => void) => boolean;
};

/** Owns editor identity so an old mutation callback cannot close a newer dialog. */
export function useLabelEditorController(
  mutations: LabelEditorMutations,
  capabilities: LabelActionCapabilities = labelActionCapabilities(['ADMIN'])
) {
  const [editor, setEditor] = useState<LabelEditorState>();
  const editorRef = useRef<LabelEditorState | undefined>(undefined);
  const publish = (next: LabelEditorState | undefined) => {
    editorRef.current = next;
    setEditor(next);
  };
  const create = () => {
    if (!capabilities.canCreate || mutations.isLocked()) return false;
    publish({ value: {}, isNew: true });
    return true;
  };
  const edit = (record: LabelRecord) => {
    if (!capabilities.canUpdate || mutations.isLocked()) return false;
    publish({ value: { ...record }, isNew: false });
    return true;
  };
  const close = () => {
    if (mutations.isInFlight()) return false;
    publish(undefined);
    return true;
  };
  const submit = (values: Partial<LabelRecord>) => {
    const submitted = editorRef.current;
    if (!submitted || mutations.isLocked()) return false;
    if (submitted.isNew ? !capabilities.canCreate : !capabilities.canUpdate) return false;
    const closeSubmittedEditor = () => {
      if (editorRef.current === submitted) publish(undefined);
    };
    return submitted.isNew
      ? mutations.createLabel(values, closeSubmittedEditor)
      : mutations.updateLabel(submitted.value, values, closeSubmittedEditor);
  };
  return { actions: { close, create, edit, submit }, state: { editor } };
}
