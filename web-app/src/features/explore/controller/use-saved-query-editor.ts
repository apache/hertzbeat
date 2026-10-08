/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useSourceScopedValue } from '@/shared/query-context';
import { useSavedQueryMutation } from './use-saved-query-mutation';

import { saveQueryRecord, deleteQueryRecord } from '../api/explore-saved-query-api';
import { buildSavedQueryPayload, type SavedQueryRecord } from '../model/explore-saved-query-model';
import type { ExploreQuery } from '../model/explore-query';
import type { SavedQueryEditor } from '../model/explore-saved-query-view-model';

type Options = {
  source: string;
  query: ExploreQuery;
  active: SavedQueryRecord | undefined;
  canWrite: boolean;
  saveBlocked: boolean;
  refresh: () => void;
  selected: (key: string | undefined) => void;
};

export function useSavedQueryEditor(options: Options) {
  const { value: editor, setValue: setEditor } = useSourceScopedValue<SavedQueryEditor | undefined>(
    `${options.source}:${options.canWrite}`,
    undefined
  );
  const mutation = useSavedQueryMutation(options.source, options.canWrite, options.refresh);
  const { busy, error, pending, mutate, clearError } = mutation;
  const begin = (mode: SavedQueryEditor['mode']) => {
    if (!options.canWrite || options.saveBlocked || pending.current || (mode !== 'create' && !options.active)) return;
    clearError();
    setEditor({
      mode,
      revision: mode === 'update' ? options.active?.revision : undefined,
      viewKey: mode === 'update' ? options.active!.viewKey : crypto.randomUUID(),
      label: mode === 'create' ? '' : options.active!.label,
      description: options.active?.description ?? ''
    });
  };
  const save = async () => {
    if (!editor || !options.canWrite || options.saveBlocked || pending.current) return;
    const key = editor.viewKey;
    await mutate(
      async () => {
        if (editor.mode === 'update' && editor.revision == null) throw new Error('Missing saved query revision');
        const payload = buildSavedQueryPayload(options.query, key, editor.label, editor.description);
        return saveQueryRecord(editor.mode === 'update' ? { ...payload, revision: editor.revision } : payload);
      },
      () => {
        setEditor(undefined);
        options.selected(key);
      }
    );
  };
  const updateActive = async () => {
    if (!options.active || !options.canWrite || options.saveBlocked || pending.current) return;
    await persistActiveView(options, mutate);
  };
  const remove = async (record: SavedQueryRecord) => {
    if (!options.canWrite || pending.current) return;
    await deleteView(record, options, mutate);
  };
  return {
    editor,
    busy,
    error,
    begin,
    save,
    updateActive,
    remove,
    closeEditor: () => {
      if (!pending.current) {
        setEditor(undefined);
        clearError();
      }
    },
    edit: (field: 'label' | 'description', value: string) => setEditor(editor ? { ...editor, [field]: value } : editor)
  };
}

type Mutate = ReturnType<typeof useSavedQueryMutation>['mutate'];

function persistActiveView(options: Options, mutate: Mutate) {
  const active = options.active!;
  return mutate(
    () => {
      if (active.revision == null) throw new Error('Missing saved query revision');
      return saveQueryRecord({
        ...buildSavedQueryPayload(options.query, active.viewKey, active.label, active.description ?? ''),
        revision: active.revision
      });
    },
    () => options.selected(active.viewKey)
  );
}

function deleteView(record: SavedQueryRecord, options: Options, mutate: Mutate) {
  return mutate(
    () => deleteQueryRecord(record.signal, record.viewKey, record.revision),
    () => {
      if (options.active?.viewKey === record.viewKey && options.active.signal === record.signal)
        options.selected(undefined);
    },
    'delete'
  );
}
