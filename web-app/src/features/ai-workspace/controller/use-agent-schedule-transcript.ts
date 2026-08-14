/* Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useCallback, useMemo, useState } from 'react';

import { listAgentScheduleTranscript } from '../api/agent-schedule-api';
import type { AgentSchedule } from '../model/agent-schedule-contract';
import type { AgentScheduleTranscriptState } from '../model/agent-schedule-view-model';

const initialTranscript: AgentScheduleTranscriptState = {
  open: false,
  schedule: null,
  kind: 'idle',
  entries: [],
  pageIndex: 0,
  hasEarlier: false,
  loadingEarlier: false
};

export function useAgentScheduleTranscript(reportFailure: () => void) {
  const [transcript, setTranscript] = useState<AgentScheduleTranscriptState>(initialTranscript);
  const openTranscript = useCallback(async (schedule: AgentSchedule) => {
    setTranscript({ ...initialTranscript, open: true, schedule, kind: 'loading' });
    try {
      const page = await listAgentScheduleTranscript(schedule.id);
      setTranscript({
        open: true,
        schedule,
        kind: page.entries.length === 0 ? 'empty' : 'ready',
        entries: [...page.entries].reverse(),
        pageIndex: page.pageIndex,
        hasEarlier: page.hasEarlier,
        loadingEarlier: false
      });
    } catch {
      setTranscript({ ...initialTranscript, open: true, schedule, kind: 'error' });
    }
  }, []);
  const loadEarlierTranscript = useLoadEarlierTranscript(transcript, setTranscript, reportFailure);
  const actions = useMemo(
    () => ({
      openTranscript,
      loadEarlierTranscript,
      closeTranscript: () => setTranscript(initialTranscript)
    }),
    [loadEarlierTranscript, openTranscript]
  );
  return { transcript, actions };
}

function useLoadEarlierTranscript(
  transcript: AgentScheduleTranscriptState,
  setTranscript: React.Dispatch<React.SetStateAction<AgentScheduleTranscriptState>>,
  reportFailure: () => void
) {
  return useCallback(async () => {
    if (!transcript.schedule || !transcript.hasEarlier || transcript.loadingEarlier) return;
    const scheduleId = transcript.schedule.id;
    setTranscript(value => ({ ...value, loadingEarlier: true }));
    try {
      const page = await listAgentScheduleTranscript(scheduleId, transcript.pageIndex + 1);
      setTranscript(value =>
        value.schedule?.id === scheduleId
          ? {
              ...value,
              kind: 'ready',
              entries: [...page.entries].reverse().concat(value.entries),
              pageIndex: page.pageIndex,
              hasEarlier: page.hasEarlier,
              loadingEarlier: false
            }
          : value
      );
    } catch {
      setTranscript(value => (value.schedule?.id === scheduleId ? { ...value, loadingEarlier: false } : value));
      reportFailure();
    }
  }, [reportFailure, setTranscript, transcript]);
}
