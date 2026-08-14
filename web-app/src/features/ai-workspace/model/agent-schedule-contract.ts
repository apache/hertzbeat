/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export type AgentSchedule = {
  id: number;
  name: string;
  instruction: string;
  cronExpression: string;
  enabled: boolean;
  sessionId: number | null;
  receiverIds: number[];
  templateId: number | null;
  createdFromSessionUid: string | null;
  lastTriggerAt: number | null;
  nextTriggerAt: number | null;
  creator: string | null;
  modifier: string | null;
  gmtCreate: string | null;
  gmtUpdate: string | null;
};

export type AgentScheduleDraft = Pick<
  AgentSchedule,
  'name' | 'instruction' | 'cronExpression' | 'enabled' | 'receiverIds' | 'templateId'
>;

export type AgentScheduleOption = { id: number; name: string; type: number };
export type AgentScheduleOptions = {
  receivers: AgentScheduleOption[];
  templates: AgentScheduleOption[];
};

export type AgentScheduleTranscriptEntry = {
  id: number;
  sequence: number;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string | null;
};

export type AgentScheduleTranscriptPage = {
  entries: AgentScheduleTranscriptEntry[];
  pageIndex: number;
  hasEarlier: boolean;
};

export type AgentSchedulePage = {
  content: AgentSchedule[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};
