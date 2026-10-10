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

import { useMemo } from 'react';

import type { AgentScheduleViewModel } from '../model/agent-schedule-view-model';
import { useAgentScheduleEditor } from './use-agent-schedule-editor';
import { useAgentScheduleList } from './use-agent-schedule-list';
import { useAgentScheduleTranscript } from './use-agent-schedule-transcript';

export function useAgentScheduleController(): AgentScheduleViewModel {
  const scheduleList = useAgentScheduleList();
  const scheduleEditor = useAgentScheduleEditor(scheduleList.list, scheduleList.load);
  const scheduleTranscript = useAgentScheduleTranscript(scheduleEditor.reportFailure);
  const actions = useMemo<AgentScheduleViewModel['actions']>(
    () => ({
      reload: scheduleList.reload,
      setPage: scheduleList.load,
      ...scheduleEditor.actions,
      ...scheduleTranscript.actions
    }),
    [scheduleEditor.actions, scheduleList.load, scheduleList.reload, scheduleTranscript.actions]
  );
  return {
    list: scheduleList.list,
    options: scheduleList.options,
    editor: scheduleEditor.editor,
    transcript: scheduleTranscript.transcript,
    busy: scheduleEditor.busy,
    mutationFailed: scheduleEditor.mutationFailed,
    actions
  };
}
