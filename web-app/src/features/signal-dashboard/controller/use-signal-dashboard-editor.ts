/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useLayoutEffect, useRef } from 'react';
import { ApiMessageError } from '@/core/http/api-message';
import { useSourceScopedValue } from '@/shared/query-context';
import { parseHertzBeatDashboardDocument, type HertzBeatDashboardDocument } from '@/platform/perses';
import { deleteSignalDashboard, saveSignalDashboard } from '../api/signal-dashboard-api';
import type { SignalDashboardRecord } from '../model/signal-dashboard-record';
import type { DashboardEditor, DashboardEditorState } from '../model/signal-dashboard-editor-model';

type Options = {
  source: string;
  canWrite: boolean;
  saved: (record: SignalDashboardRecord) => void;
  removed: (key: string) => void;
};

export function useSignalDashboardEditor(options: Options) {
  const source = `${options.source}:${options.canWrite}`;
  const { value: state, setValue: setState } = useSourceScopedValue<DashboardEditorState>(source, {
    draft: undefined,
    busy: false,
    error: undefined
  });
  const run = useDashboardWriteOperation(source, options.canWrite, state, setState);
  const begin = (draft: DashboardEditor) => {
    if (options.canWrite && !state.busy) setState({ draft, busy: false, error: undefined });
  };
  const save = async () => {
    if (!state.draft) return;
    try {
      parseHertzBeatDashboardDocument(state.draft.document);
    } catch {
      setState({ ...state, error: 'invalidDocument' });
      return;
    }
    await run(
      () => saveSignalDashboard(state.draft!.document, state.draft!.original),
      result => options.saved(result as SignalDashboardRecord)
    );
  };
  return {
    ...state,
    canWrite: options.canWrite,
    begin,
    save,
    cancel: () => {
      if (!state.busy) setState({ draft: undefined, busy: false, error: undefined });
    },
    update: (document: HertzBeatDashboardDocument) => {
      if (state.draft && !state.busy && state.draft.mode !== 'upgrade')
        setState({ ...state, draft: { ...state.draft, document }, error: undefined });
    },
    remove: (record: SignalDashboardRecord) =>
      run(
        () => deleteSignalDashboard(record.dashboardKey, record.revision!),
        () => options.removed(record.dashboardKey)
      )
  };
}

function useDashboardWriteOperation(
  source: string,
  canWrite: boolean,
  state: DashboardEditorState,
  setState: (state: DashboardEditorState) => void
) {
  const authority = useRef('');
  const pending = useRef<{ source: string }>();
  useLayoutEffect(() => {
    authority.current = source;
    return () => {
      authority.current = '';
      pending.current = undefined;
    };
  }, [source]);
  const run = async (write: () => Promise<unknown>, succeeded: (result: unknown) => void) => {
    if (!canWrite || pending.current?.source === source) return;
    const operation = { source };
    pending.current = operation;
    setState({ ...state, busy: true, error: undefined });
    try {
      const result = await write();
      if (authority.current === source && pending.current === operation) {
        succeeded(result);
        setState({ draft: undefined, busy: false, error: undefined });
      }
    } catch (error) {
      if (authority.current === source && pending.current === operation) {
        setState({
          ...state,
          busy: false,
          error: error instanceof ApiMessageError && error.status === 409 ? 'conflict' : 'writeFailed'
        });
      }
    } finally {
      if (pending.current === operation) pending.current = undefined;
    }
  };
  return run;
}
