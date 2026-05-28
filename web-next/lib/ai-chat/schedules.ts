import type { HzAiChatScheduleDraft, HzAiChatScheduleRow, HzAiChatScheduleSkillOption, HzAiChatScheduleStatus } from '@hertzbeat/ui';
import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '@/lib/api-client';

const AI_CHAT_SCHEDULE_TIMEOUT_MS = 3500;

export type AiChatSopSchedule = {
  id?: string | number;
  conversationId: string | number;
  sopName: string;
  sopParams?: string;
  cronExpression: string;
  enabled: boolean;
  lastRunTime?: string | number | Date | null;
  nextRunTime?: string | number | Date | null;
  gmtCreate?: string | number | Date | null;
  gmtUpdate?: string | number | Date | null;
};

type RawSkillInfo = {
  name?: string | null;
  description?: string | null;
};

export type AiChatScheduleListState = {
  status: Extract<HzAiChatScheduleStatus, 'ready' | 'empty' | 'error'>;
  schedules: HzAiChatScheduleRow[];
  statusLabelKey: string;
};

export type AiChatScheduleSkillState = {
  status: Extract<HzAiChatScheduleStatus, 'ready' | 'empty' | 'error'>;
  skills: HzAiChatScheduleSkillOption[];
  statusLabelKey: string;
};

export type AiChatScheduleMutationState = {
  status: Extract<HzAiChatScheduleStatus, 'ready' | 'error'>;
  schedule?: HzAiChatScheduleRow;
  scheduleId?: string | number;
  statusLabelKey: string;
};

export const AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS = {
  idle: 'ai.chat.schedule.idle',
  loading: 'ai.chat.schedule.loading',
  ready: 'ai.chat.schedule.ready',
  empty: 'ai.chat.schedule.empty',
  saving: 'ai.chat.schedule.saving',
  error: 'ai.chat.schedule.error',
  createSuccess: 'ai.chat.schedule.create.success',
  createFailed: 'ai.chat.schedule.create.failed',
  updateSuccess: 'ai.chat.schedule.update.success',
  updateFailed: 'ai.chat.schedule.update.failed',
  deleteSuccess: 'ai.chat.schedule.delete.success',
  deleteFailed: 'ai.chat.schedule.delete.failed',
  toggleSuccess: 'ai.chat.schedule.toggle.success',
  toggleFailed: 'ai.chat.schedule.toggle.failed'
} as const;

async function promiseWithAiChatScheduleTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof globalThis.setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = globalThis.setTimeout(() => reject(new Error('AI chat schedule request timed out')), AI_CHAT_SCHEDULE_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (timeout) {
      globalThis.clearTimeout(timeout);
    }
  }
}

export function mapAiChatScheduleRow(schedule: AiChatSopSchedule, index = 0): HzAiChatScheduleRow {
  return {
    id: schedule.id ?? `schedule-${index}`,
    sopName: schedule.sopName || `Schedule ${index + 1}`,
    cronExpression: schedule.cronExpression || '',
    enabled: Boolean(schedule.enabled)
  };
}

export function mapAiChatSchedules(raw: AiChatSopSchedule[] | null | undefined): AiChatScheduleListState {
  const schedules = (raw || []).map((schedule, index) => mapAiChatScheduleRow(schedule, index));
  return {
    status: schedules.length > 0 ? 'ready' : 'empty',
    schedules,
    statusLabelKey: schedules.length > 0 ? AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS.ready : AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS.empty
  };
}

export function mapAiChatScheduleSkills(raw: RawSkillInfo[] | null | undefined): AiChatScheduleSkillState {
  const skills = (raw || [])
    .map(skill => {
      const name = skill.name?.trim();
      if (!name) return null;
      const description = skill.description?.trim();
      return {
        value: name,
        label: description ? `${name} - ${description}` : name
      };
    })
    .filter((skill): skill is HzAiChatScheduleSkillOption => skill !== null);

  return {
    status: skills.length > 0 ? 'ready' : 'empty',
    skills,
    statusLabelKey: skills.length > 0 ? AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS.ready : AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS.empty
  };
}

function buildSchedulePayload(conversationId: string | number, draft: HzAiChatScheduleDraft): AiChatSopSchedule {
  return {
    conversationId,
    sopName: draft.sopName,
    cronExpression: draft.cronExpression,
    enabled: draft.enabled ?? true
  };
}

export async function loadAiChatSchedules(conversationId: string | number): Promise<AiChatScheduleListState> {
  try {
    const encodedConversationId = encodeURIComponent(String(conversationId));
    return mapAiChatSchedules(
      await promiseWithAiChatScheduleTimeout(apiMessageGet<AiChatSopSchedule[]>(`/ai/schedule/conversation/${encodedConversationId}`))
    );
  } catch {
    return {
      status: 'error',
      schedules: [],
      statusLabelKey: AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS.error
    };
  }
}

export async function loadAiChatScheduleSkills(): Promise<AiChatScheduleSkillState> {
  try {
    return mapAiChatScheduleSkills(await promiseWithAiChatScheduleTimeout(apiMessageGet<RawSkillInfo[]>('/ai/schedule/skills')));
  } catch {
    return {
      status: 'error',
      skills: [],
      statusLabelKey: AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS.error
    };
  }
}

export async function createAiChatSchedule(
  conversationId: string | number,
  draft: HzAiChatScheduleDraft
): Promise<AiChatScheduleMutationState> {
  try {
    return {
      status: 'ready',
      schedule: mapAiChatScheduleRow(
        await promiseWithAiChatScheduleTimeout(apiMessagePost<AiChatSopSchedule>('/ai/schedule', buildSchedulePayload(conversationId, draft)))
      ),
      statusLabelKey: AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS.createSuccess
    };
  } catch {
    return {
      status: 'error',
      statusLabelKey: AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS.createFailed
    };
  }
}

export async function updateAiChatSchedule(
  scheduleId: string | number,
  conversationId: string | number,
  draft: HzAiChatScheduleDraft
): Promise<AiChatScheduleMutationState> {
  try {
    const encodedScheduleId = encodeURIComponent(String(scheduleId));
    return {
      status: 'ready',
      schedule: mapAiChatScheduleRow(
        await promiseWithAiChatScheduleTimeout(
          apiMessagePut<AiChatSopSchedule>(`/ai/schedule/${encodedScheduleId}`, {
            ...buildSchedulePayload(conversationId, draft),
            id: scheduleId
          })
        )
      ),
      statusLabelKey: AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS.updateSuccess
    };
  } catch {
    return {
      status: 'error',
      scheduleId,
      statusLabelKey: AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS.updateFailed
    };
  }
}

export async function toggleAiChatSchedule(scheduleId: string | number, enabled: boolean): Promise<AiChatScheduleMutationState> {
  try {
    const encodedScheduleId = encodeURIComponent(String(scheduleId));
    return {
      status: 'ready',
      schedule: mapAiChatScheduleRow(
        await promiseWithAiChatScheduleTimeout(
          apiMessagePut<AiChatSopSchedule>(`/ai/schedule/${encodedScheduleId}/toggle?enabled=${enabled}`, {})
        )
      ),
      statusLabelKey: AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS.toggleSuccess
    };
  } catch {
    return {
      status: 'error',
      scheduleId,
      statusLabelKey: AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS.toggleFailed
    };
  }
}

export async function deleteAiChatSchedule(scheduleId: string | number): Promise<AiChatScheduleMutationState> {
  try {
    const encodedScheduleId = encodeURIComponent(String(scheduleId));
    await promiseWithAiChatScheduleTimeout(apiMessageDelete<void>(`/ai/schedule/${encodedScheduleId}`));
    return {
      status: 'ready',
      scheduleId,
      statusLabelKey: AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS.deleteSuccess
    };
  } catch {
    return {
      status: 'error',
      scheduleId,
      statusLabelKey: AI_CHAT_SCHEDULE_STATUS_LABEL_KEYS.deleteFailed
    };
  }
}
