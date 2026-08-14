/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createAgentSchedule,
  deleteAgentSchedule,
  listAgentScheduleOptions,
  listAgentScheduleTranscript,
  listAgentSchedules,
  runAgentSchedule,
  toggleAgentSchedule,
  updateAgentSchedule
} from './agent-schedule-api';

const schedule = {
  id: 7,
  name: 'Daily inspection',
  instruction: 'Inspect critical services',
  cronExpression: '0 0 9 * * *',
  enabled: true,
  sessionId: 11,
  receiverIds: [3],
  templateId: null,
  createdFromSessionUid: null,
  lastTriggerAt: null,
  nextTriggerAt: 1_800_000_000_000,
  creator: 'admin',
  modifier: 'admin',
  gmtCreate: '2026-08-14T08:00:00',
  gmtUpdate: '2026-08-14T08:00:00'
};

describe('Agent schedule browser API', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses exact schedule CRUD, toggle, and run endpoints', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(message(page([schedule])))
      .mockResolvedValueOnce(message(schedule))
      .mockResolvedValueOnce(message({ ...schedule, name: 'Updated' }))
      .mockResolvedValueOnce(message({ ...schedule, enabled: false }))
      .mockResolvedValueOnce(message({ runUid: 'run-1', status: 'CREATED' }))
      .mockResolvedValueOnce(message(null));
    vi.stubGlobal('fetch', fetchMock);

    await listAgentSchedules(0, 20);
    await createAgentSchedule(schedule);
    await updateAgentSchedule(7, { ...schedule, name: 'Updated' });
    await toggleAgentSchedule(7, false);
    await runAgentSchedule(7);
    await deleteAgentSchedule(7);

    expect(fetchMock.mock.calls.map(call => [call[0], call[1]?.method ?? 'GET'])).toEqual([
      ['/api/agent/schedules?pageIndex=0&pageSize=20', 'GET'],
      ['/api/agent/schedules', 'POST'],
      ['/api/agent/schedules/7', 'PUT'],
      ['/api/agent/schedules/7/enabled?enabled=false', 'PATCH'],
      ['/api/agent/schedules/7/run', 'POST'],
      ['/api/agent/schedules/7', 'DELETE']
    ]);
  });

  it('loads receiver and template choices without exposing their secret fields', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(message([{ id: 3, name: 'Operations', type: 1 }]))
      .mockResolvedValueOnce(message([{ id: 5, name: 'AI report', type: 1, preset: false, content: 'private' }]));
    vi.stubGlobal('fetch', fetchMock);

    const options = await listAgentScheduleOptions();

    expect(options).toEqual({
      receivers: [{ id: 3, name: 'Operations', type: 1 }],
      templates: [{ id: 5, name: 'AI report', type: 1 }]
    });
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual([
      '/api/notice/receivers/all',
      '/api/notice/templates/all'
    ]);
  });

  it('loads the fixed schedule transcript and exposes text blocks only', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      message(
        page([
          {
            id: 19,
            sessionSequence: 2,
            messageRole: 'ASSISTANT',
            payloadJson: JSON.stringify({
              role: 'assistant',
              content: [
                { type: 'text', text: 'Database saturation is stable.' },
                { type: 'tool_result', text: 'private tool payload' }
              ]
            }),
            gmtCreate: '2026-08-14T09:00:00'
          }
        ])
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(listAgentScheduleTranscript(7)).resolves.toEqual({
      entries: [
        {
          id: 19,
          sequence: 2,
          role: 'assistant',
          text: 'Database saturation is stable.',
          createdAt: '2026-08-14T09:00:00'
        }
      ],
      pageIndex: 0,
      hasEarlier: false
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/agent/schedules/7/transcript?pageIndex=0&pageSize=20',
      expect.objectContaining({ credentials: 'same-origin' })
    );
  });
});

function page(content: unknown[]) {
  return { content, totalElements: content.length, totalPages: 1, number: 0, size: 20 };
}

function message(data: unknown) {
  return new Response(JSON.stringify({ code: 0, msg: null, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
