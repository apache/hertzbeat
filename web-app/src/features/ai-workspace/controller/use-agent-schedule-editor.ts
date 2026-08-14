/* Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useCallback, useMemo, useState } from 'react';

import {
  createAgentSchedule,
  deleteAgentSchedule,
  runAgentSchedule,
  toggleAgentSchedule,
  updateAgentSchedule
} from '../api/agent-schedule-api';
import type { AgentSchedule, AgentScheduleDraft } from '../model/agent-schedule-contract';
import type { AgentScheduleEditorState, AgentScheduleListState } from '../model/agent-schedule-view-model';

type LoadSchedules = (pageIndex: number, pageSize: number, signal?: AbortSignal) => Promise<void>;

export function useAgentScheduleEditor(list: AgentScheduleListState, load: LoadSchedules) {
  const [editor, setEditor] = useState<AgentScheduleEditorState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [mutationFailed, setMutationFailed] = useState(false);
  const mutate = useScheduleMutation(list, load, setBusy, setMutationFailed);
  const actions = useMemo(
    () => ({
      openCreate: () => setEditor({ mode: 'create' as const, scheduleId: null, draft: newDraft() }),
      openEdit: (schedule: AgentSchedule) => setEditor(editorFor(schedule)),
      closeEditor: () => setEditor(null),
      updateDraft: (patch: Partial<AgentScheduleDraft>) =>
        setEditor(current => (current ? { ...current, draft: { ...current.draft, ...patch } } : null)),
      save: async () => {
        if (!editor) return;
        const saved = await mutate('save', () =>
          editor.scheduleId === null
            ? createAgentSchedule(editor.draft)
            : updateAgentSchedule(editor.scheduleId, editor.draft)
        );
        if (saved) setEditor(null);
      },
      toggle: async (scheduleId: number, enabled: boolean) => {
        await mutate(`toggle:${scheduleId}`, () => toggleAgentSchedule(scheduleId, enabled));
      },
      run: async (scheduleId: number) => {
        await mutate(`run:${scheduleId}`, () => runAgentSchedule(scheduleId));
      },
      delete: async (scheduleId: number) => {
        await mutate(`delete:${scheduleId}`, () => deleteAgentSchedule(scheduleId));
      }
    }),
    [editor, mutate]
  );
  const reportFailure = useCallback(() => setMutationFailed(true), []);
  return { editor, busy, mutationFailed, reportFailure, actions };
}

function useScheduleMutation(
  list: AgentScheduleListState,
  load: LoadSchedules,
  setBusy: (value: string | null) => void,
  setMutationFailed: (value: boolean) => void
) {
  return useCallback(
    async (key: string, action: () => Promise<unknown>) => {
      setBusy(key);
      setMutationFailed(false);
      try {
        await action();
        await load(list.pageIndex, list.pageSize);
        return true;
      } catch {
        setMutationFailed(true);
        return false;
      } finally {
        setBusy(null);
      }
    },
    [list.pageIndex, list.pageSize, load, setBusy, setMutationFailed]
  );
}

function newDraft(): AgentScheduleDraft {
  return {
    name: '',
    instruction: '',
    cronExpression: '0 0 * * * *',
    enabled: true,
    receiverIds: [],
    templateId: null
  };
}

function editorFor(schedule: AgentSchedule): AgentScheduleEditorState {
  return {
    mode: 'edit',
    scheduleId: schedule.id,
    draft: {
      name: schedule.name,
      instruction: schedule.instruction,
      cronExpression: schedule.cronExpression,
      enabled: schedule.enabled,
      receiverIds: [...schedule.receiverIds],
      templateId: schedule.templateId
    }
  };
}
