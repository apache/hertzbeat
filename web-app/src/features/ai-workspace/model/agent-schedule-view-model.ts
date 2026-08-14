/* Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type {
  AgentSchedule,
  AgentScheduleDraft,
  AgentScheduleOptions,
  AgentScheduleTranscriptEntry
} from './agent-schedule-contract';

export type AgentScheduleListState = {
  kind: 'loading' | 'ready' | 'empty' | 'error';
  items: AgentSchedule[];
  total: number;
  pageIndex: number;
  pageSize: number;
};

export type AgentScheduleEditorState = {
  mode: 'create' | 'edit';
  scheduleId: number | null;
  draft: AgentScheduleDraft;
};

export type AgentScheduleTranscriptState = {
  open: boolean;
  schedule: AgentSchedule | null;
  kind: 'idle' | 'loading' | 'ready' | 'empty' | 'error';
  entries: AgentScheduleTranscriptEntry[];
  pageIndex: number;
  hasEarlier: boolean;
  loadingEarlier: boolean;
};

export type AgentScheduleViewModel = {
  list: AgentScheduleListState;
  options: AgentScheduleOptions;
  editor: AgentScheduleEditorState | null;
  transcript: AgentScheduleTranscriptState;
  busy: string | null;
  mutationFailed: boolean;
  actions: {
    reload: () => Promise<void>;
    setPage: (pageIndex: number, pageSize: number) => Promise<void>;
    openCreate: () => void;
    openEdit: (schedule: AgentSchedule) => void;
    closeEditor: () => void;
    updateDraft: (patch: Partial<AgentScheduleDraft>) => void;
    save: () => Promise<void>;
    toggle: (scheduleId: number, enabled: boolean) => Promise<void>;
    run: (scheduleId: number) => Promise<void>;
    delete: (scheduleId: number) => Promise<void>;
    openTranscript: (schedule: AgentSchedule) => Promise<void>;
    loadEarlierTranscript: () => Promise<void>;
    closeTranscript: () => void;
  };
};
