import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAiChatSchedule,
  deleteAiChatSchedule,
  loadAiChatScheduleSkills,
  loadAiChatSchedules,
  mapAiChatScheduleSkills,
  mapAiChatSchedules,
  toggleAiChatSchedule,
  updateAiChatSchedule
} from './schedules';

vi.mock('@/lib/api-client', () => ({
  apiMessageGet: vi.fn(),
  apiMessagePost: vi.fn(),
  apiMessagePut: vi.fn(),
  apiMessageDelete: vi.fn()
}));

describe('AI chat schedule controller', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('maps Angular SOP schedules into shared rows', () => {
    expect(mapAiChatSchedules([
      { id: 7, conversationId: 1, sopName: 'daily-health', cronExpression: '0 0 9 * * ?', enabled: true },
      { id: 8, conversationId: 1, sopName: 'weekly-report', cronExpression: '0 0 9 ? * MON', enabled: false }
    ])).toEqual({
      status: 'ready',
      schedules: [
        { id: 7, sopName: 'daily-health', cronExpression: '0 0 9 * * ?', enabled: true },
        { id: 8, sopName: 'weekly-report', cronExpression: '0 0 9 ? * MON', enabled: false }
      ],
      statusLabelKey: 'ai.chat.schedule.ready'
    });
  });

  it('maps available skills into select options with descriptions', () => {
    expect(mapAiChatScheduleSkills([
      { name: 'daily-health', description: 'Daily health report' },
      { name: 'weekly-report', description: '' },
      { name: '   ', description: 'ignored' }
    ])).toEqual({
      status: 'ready',
      skills: [
        { value: 'daily-health', label: 'daily-health - Daily health report' },
        { value: 'weekly-report', label: 'weekly-report' }
      ],
      statusLabelKey: 'ai.chat.schedule.ready'
    });
  });

  it('loads schedules and skills from the Angular endpoints', async () => {
    const { apiMessageGet } = await import('@/lib/api-client');
    vi.mocked(apiMessageGet)
      .mockResolvedValueOnce([{ id: 7, conversationId: 1, sopName: 'daily-health', cronExpression: '0 0 9 * * ?', enabled: true }])
      .mockResolvedValueOnce([{ name: 'daily-health', description: 'Daily health report' }]);

    await expect(loadAiChatSchedules(1)).resolves.toMatchObject({
      status: 'ready',
      schedules: [{ id: 7, sopName: 'daily-health', cronExpression: '0 0 9 * * ?', enabled: true }]
    });
    await expect(loadAiChatScheduleSkills()).resolves.toMatchObject({
      status: 'ready',
      skills: [{ value: 'daily-health', label: 'daily-health - Daily health report' }]
    });
    expect(apiMessageGet).toHaveBeenCalledWith('/ai/schedule/conversation/1');
    expect(apiMessageGet).toHaveBeenCalledWith('/ai/schedule/skills');
  });

  it('creates a schedule through POST /ai/schedule', async () => {
    const { apiMessagePost } = await import('@/lib/api-client');
    vi.mocked(apiMessagePost).mockResolvedValueOnce({
      id: 9,
      conversationId: 1,
      sopName: 'daily-health',
      cronExpression: '0 0 9 * * ?',
      enabled: true
    });

    await expect(createAiChatSchedule(1, { sopName: 'daily-health', cronExpression: '0 0 9 * * ?', enabled: true })).resolves.toEqual({
      status: 'ready',
      schedule: { id: 9, sopName: 'daily-health', cronExpression: '0 0 9 * * ?', enabled: true },
      statusLabelKey: 'ai.chat.schedule.create.success'
    });
    expect(apiMessagePost).toHaveBeenCalledWith('/ai/schedule', {
      conversationId: 1,
      sopName: 'daily-health',
      cronExpression: '0 0 9 * * ?',
      enabled: true
    });
  });

  it('updates, toggles, and deletes schedules through Angular endpoints', async () => {
    const { apiMessagePut, apiMessageDelete } = await import('@/lib/api-client');
    vi.mocked(apiMessagePut)
      .mockResolvedValueOnce({ id: 9, conversationId: 1, sopName: 'daily-health', cronExpression: '0 15 9 * * ?', enabled: true })
      .mockResolvedValueOnce({ id: 9, conversationId: 1, sopName: 'daily-health', cronExpression: '0 15 9 * * ?', enabled: false });
    vi.mocked(apiMessageDelete).mockResolvedValueOnce(undefined);

    await expect(updateAiChatSchedule(9, 1, { sopName: 'daily-health', cronExpression: '0 15 9 * * ?', enabled: true })).resolves.toMatchObject({
      status: 'ready',
      schedule: { id: 9, cronExpression: '0 15 9 * * ?', enabled: true },
      statusLabelKey: 'ai.chat.schedule.update.success'
    });
    await expect(toggleAiChatSchedule(9, false)).resolves.toMatchObject({
      status: 'ready',
      schedule: { id: 9, enabled: false },
      statusLabelKey: 'ai.chat.schedule.toggle.success'
    });
    await expect(deleteAiChatSchedule(9)).resolves.toEqual({
      status: 'ready',
      scheduleId: 9,
      statusLabelKey: 'ai.chat.schedule.delete.success'
    });

    expect(apiMessagePut).toHaveBeenCalledWith('/ai/schedule/9', {
      id: 9,
      conversationId: 1,
      sopName: 'daily-health',
      cronExpression: '0 15 9 * * ?',
      enabled: true
    });
    expect(apiMessagePut).toHaveBeenCalledWith('/ai/schedule/9/toggle?enabled=false', {});
    expect(apiMessageDelete).toHaveBeenCalledWith('/ai/schedule/9');
  });

  it('returns localized failure keys instead of throwing', async () => {
    const { apiMessageGet, apiMessagePost, apiMessagePut, apiMessageDelete } = await import('@/lib/api-client');
    vi.mocked(apiMessageGet).mockRejectedValue(new Error('503'));
    vi.mocked(apiMessagePost).mockRejectedValue(new Error('503'));
    vi.mocked(apiMessagePut).mockRejectedValue(new Error('503'));
    vi.mocked(apiMessageDelete).mockRejectedValue(new Error('503'));

    await expect(loadAiChatSchedules(1)).resolves.toMatchObject({ status: 'error', statusLabelKey: 'ai.chat.schedule.error' });
    await expect(loadAiChatScheduleSkills()).resolves.toMatchObject({ status: 'error', statusLabelKey: 'ai.chat.schedule.error' });
    await expect(createAiChatSchedule(1, { sopName: 'daily-health', cronExpression: '0 0 9 * * ?' })).resolves.toMatchObject({
      status: 'error',
      statusLabelKey: 'ai.chat.schedule.create.failed'
    });
    await expect(updateAiChatSchedule(9, 1, { sopName: 'daily-health', cronExpression: '0 0 9 * * ?' })).resolves.toMatchObject({
      status: 'error',
      statusLabelKey: 'ai.chat.schedule.update.failed'
    });
    await expect(toggleAiChatSchedule(9, true)).resolves.toMatchObject({
      status: 'error',
      statusLabelKey: 'ai.chat.schedule.toggle.failed'
    });
    await expect(deleteAiChatSchedule(9)).resolves.toMatchObject({
      status: 'error',
      statusLabelKey: 'ai.chat.schedule.delete.failed'
    });
  });
});
