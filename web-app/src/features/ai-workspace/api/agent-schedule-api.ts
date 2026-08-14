/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import {
  apiMessageDelete,
  apiMessageGet,
  apiMessagePatch,
  apiMessagePost,
  apiMessagePut
} from '@/core/http/api-message';

import type {
  AgentScheduleDraft,
  AgentScheduleOptions,
  AgentScheduleTranscriptEntry,
  AgentScheduleTranscriptPage
} from '../model/agent-schedule-contract';
import {
  agentSchedulePageSchema,
  agentScheduleRunSchema,
  agentScheduleSchema,
  agentScheduleTemplateSchema,
  agentScheduleTranscriptSchema,
  agentScheduleOptionSchema
} from './agent-schedule-schema';

const schedulesPath = '/api/agent/schedules';

export function listAgentSchedules(pageIndex: number, pageSize: number, signal?: AbortSignal) {
  return parse(
    agentSchedulePageSchema,
    apiMessageGet(`${schedulesPath}?pageIndex=${pageIndex}&pageSize=${pageSize}`, signal ? { signal } : {})
  );
}

export function createAgentSchedule(draft: AgentScheduleDraft) {
  return parse(agentScheduleSchema, apiMessagePost(schedulesPath, payload(draft)));
}

export function updateAgentSchedule(scheduleId: number, draft: AgentScheduleDraft) {
  return parse(agentScheduleSchema, apiMessagePut(`${schedulesPath}/${scheduleId}`, payload(draft)));
}

export function toggleAgentSchedule(scheduleId: number, enabled: boolean) {
  return parse(agentScheduleSchema, apiMessagePatch(`${schedulesPath}/${scheduleId}/enabled?enabled=${enabled}`, {}));
}

export function runAgentSchedule(scheduleId: number) {
  return parse(agentScheduleRunSchema, apiMessagePost(`${schedulesPath}/${scheduleId}/run`, {}));
}

export async function deleteAgentSchedule(scheduleId: number) {
  await apiMessageDelete(`${schedulesPath}/${scheduleId}`);
}

export async function listAgentScheduleOptions(signal?: AbortSignal): Promise<AgentScheduleOptions> {
  const request = signal ? { signal } : {};
  const [receiverValue, templateValue] = await Promise.all([
    apiMessageGet('/api/notice/receivers/all', request),
    apiMessageGet('/api/notice/templates/all', request)
  ]);
  const receivers = agentScheduleOptionSchema.array().parse(receiverValue);
  const templates = agentScheduleTemplateSchema
    .array()
    .parse(templateValue)
    .flatMap(option => (option.id == null ? [] : [{ id: option.id, name: option.name, type: option.type }]));
  return { receivers, templates };
}

export async function listAgentScheduleTranscript(
  scheduleId: number,
  pageIndex = 0,
  pageSize = 20,
  signal?: AbortSignal
): Promise<AgentScheduleTranscriptPage> {
  const value = await apiMessageGet(
    `${schedulesPath}/${scheduleId}/transcript?pageIndex=${pageIndex}&pageSize=${pageSize}`,
    signal ? { signal } : {}
  );
  const page = agentScheduleTranscriptSchema.parse(value);
  return {
    entries: page.content.flatMap(entry => transcriptEntry(entry)),
    pageIndex: page.number,
    hasEarlier: page.number + 1 < page.totalPages
  };
}

function payload(draft: AgentScheduleDraft): AgentScheduleDraft {
  return {
    name: draft.name.trim(),
    instruction: draft.instruction.trim(),
    cronExpression: draft.cronExpression.trim(),
    enabled: draft.enabled,
    receiverIds: [...draft.receiverIds],
    templateId: draft.templateId
  };
}

async function parse<T>(schema: { parse: (value: unknown) => T }, value: Promise<unknown>): Promise<T> {
  return schema.parse(await value);
}

function transcriptEntry(entry: {
  id: number;
  sessionSequence: number;
  payloadJson: string;
  gmtCreate: string | null;
}): AgentScheduleTranscriptEntry[] {
  try {
    const payload = JSON.parse(entry.payloadJson) as {
      role?: unknown;
      content?: Array<{ type?: string; text?: unknown }>;
    };
    if (payload.role !== 'user' && payload.role !== 'assistant') return [];
    const role = payload.role;
    const text = (payload.content ?? [])
      .flatMap(block => (block.type === 'text' && typeof block.text === 'string' ? [block.text] : []))
      .join('\n');
    return text ? [{ id: entry.id, sequence: entry.sessionSequence, role, text, createdAt: entry.gmtCreate }] : [];
  } catch {
    return [];
  }
}
