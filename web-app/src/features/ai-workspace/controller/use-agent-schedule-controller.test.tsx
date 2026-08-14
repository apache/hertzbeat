/* Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  createAgentSchedule: vi.fn(),
  deleteAgentSchedule: vi.fn(),
  listAgentScheduleOptions: vi.fn(),
  listAgentSchedules: vi.fn(),
  listAgentScheduleTranscript: vi.fn(),
  runAgentSchedule: vi.fn(),
  toggleAgentSchedule: vi.fn(),
  updateAgentSchedule: vi.fn()
}));
vi.mock('../api/agent-schedule-api', () => api);

import { useAgentScheduleController } from './use-agent-schedule-controller';

describe('useAgentScheduleController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listAgentSchedules.mockResolvedValue(page([schedule]));
    api.listAgentScheduleOptions.mockResolvedValue(options);
    api.createAgentSchedule.mockResolvedValue(schedule);
    api.listAgentScheduleTranscript.mockResolvedValue({ entries: [transcript], pageIndex: 0, hasEarlier: false });
  });

  it('loads options once with the page and creates a complete schedule draft', async () => {
    const { result } = renderHook(() => useAgentScheduleController());
    await waitFor(() => expect(result.current.list.kind).toBe('ready'));

    act(() => result.current.actions.openCreate());
    act(() =>
      result.current.actions.updateDraft({
        name: 'Availability review',
        instruction: 'Review availability.',
        receiverIds: [11]
      })
    );
    await act(() => result.current.actions.save());

    expect(api.createAgentSchedule).toHaveBeenCalledWith({
      name: 'Availability review',
      instruction: 'Review availability.',
      cronExpression: '0 0 * * * *',
      enabled: true,
      receiverIds: [11],
      templateId: null
    });
    expect(api.listAgentSchedules).toHaveBeenCalledTimes(2);
    expect(result.current.editor).toBeNull();
  });

  it('loads the fixed transcript without rerunning the schedule', async () => {
    const { result } = renderHook(() => useAgentScheduleController());
    await waitFor(() => expect(result.current.list.kind).toBe('ready'));

    await act(() => result.current.actions.openTranscript(schedule));

    expect(api.listAgentScheduleTranscript).toHaveBeenCalledWith(7);
    expect(api.runAgentSchedule).not.toHaveBeenCalled();
    expect(result.current.transcript).toMatchObject({ kind: 'ready', entries: [transcript] });
  });
});

const schedule = {
  id: 7,
  name: 'Daily database review',
  instruction: 'Review database saturation.',
  cronExpression: '0 0 9 * * *',
  enabled: true,
  sessionId: 9,
  receiverIds: [11],
  templateId: 21,
  createdFromSessionUid: null,
  lastTriggerAt: null,
  nextTriggerAt: 1_786_678_800_000,
  creator: 'admin',
  modifier: 'admin',
  gmtCreate: null,
  gmtUpdate: null
};

const options = {
  receivers: [{ id: 11, name: 'On-call email', type: 1 }],
  templates: [{ id: 21, name: 'AI review', type: 1 }]
};

const transcript = {
  id: 19,
  sequence: 2,
  role: 'assistant' as const,
  text: 'Database saturation is stable.',
  createdAt: '2026-08-14T09:00:00'
};

function page(content: (typeof schedule)[]) {
  return { content, totalElements: content.length, totalPages: 1, number: 0, size: 20 };
}
