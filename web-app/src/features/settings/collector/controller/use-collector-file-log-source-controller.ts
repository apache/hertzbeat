/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  buildManagedOtelFileLogSourcesUpdate,
  managedOtelFileLogSourceDraft
} from '../api/collector-file-log-source-schema';
import {
  applyFileLogSource,
  cancelFileLogSource,
  removeFileLogSource,
  selectFileLogSource,
  type ManagedFileLogSourceDraft,
  type ManagedFileLogSourceSelection,
  type ManagedFileLogSourceView
} from '../model/collector-file-log-source-model';
import { useCollectorRuntimeSourceSession, type RuntimeSourceAdapter } from './use-collector-runtime-source-session';

type Options = Omit<Parameters<typeof useCollectorRuntimeSourceSession<ManagedFileLogSourceView>>[0], 'adapter'>;

const adapter: RuntimeSourceAdapter<ManagedFileLogSourceView> = {
  read: current => ({ sources: current.fileLogSources.map(managedOtelFileLogSourceDraft), selection: null }),
  buildUpdate: (current, draft) => buildManagedOtelFileLogSourcesUpdate(current, draft.sources),
  successKey: 'collectors.runtime.fileLog.success'
};

export function useCollectorFileLogSourceController(options: Options) {
  const source = useCollectorRuntimeSourceSession({ ...options, adapter });
  const draft = source.editor?.draft ?? null;
  const select = (selection: ManagedFileLogSourceSelection) => {
    if (!draft) return;
    const next = selectFileLogSource(draft, selection);
    if (next) source.replaceDraft(next);
  };
  const apply = (item: ManagedFileLogSourceDraft) => {
    if (!source.editor) return;
    const next = applyFileLogSource(source.editor.draft, item);
    if (!next || !buildManagedOtelFileLogSourcesUpdate(source.editor.current, next.sources)) {
      source.reject();
      return;
    }
    source.replaceDraft(next);
  };
  const remove = (index: number) => {
    if (!draft) return;
    const next = removeFileLogSource(draft, index);
    if (next) source.replaceDraft(next);
  };
  const cancelSource = () => {
    if (draft) source.replaceDraft(cancelFileLogSource(draft));
  };
  const editor = source.editor
    ? { record: source.editor.record, sources: source.editor.draft.sources, selection: source.editor.draft.selection }
    : null;
  return { ...source, editor, select, apply, remove, cancelSource };
}
