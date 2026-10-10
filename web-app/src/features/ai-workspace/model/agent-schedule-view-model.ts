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
