/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { AgentGatewayEvent } from './agent-workspace-contract';

type AgentRunMessage = { id: string; text: string; status: 'streaming' | 'complete' };
export type AgentToolActivity = {
  toolCallId: string;
  toolName: string;
  status: string;
  elapsedMs?: number;
  errorMessage?: string;
};
type AgentApproval = { approvalId: string; toolCallId: string; toolName: string; status: string };
export type AgentInputRequest = {
  interactionId: string;
  targetTool: string;
  title: string;
  description: string;
  fields: Record<string, unknown>[];
  status: string;
};

export type AgentWorkspaceRunState = {
  runUid?: string;
  status: 'idle' | 'running' | 'complete' | 'error';
  messages: AgentRunMessage[];
  tools: AgentToolActivity[];
  approvals: AgentApproval[];
  inputs: AgentInputRequest[];
  errorMessage?: string;
};

export const initialAgentWorkspaceRun: AgentWorkspaceRunState = {
  status: 'idle',
  messages: [],
  tools: [],
  approvals: [],
  inputs: []
};

export type AgentWorkspaceAction = AgentGatewayEvent | { type: 'WORKSPACE_RESET' };

export function agentWorkspaceReducer(
  state: AgentWorkspaceRunState,
  event: AgentWorkspaceAction
): AgentWorkspaceRunState {
  if (event.type === 'WORKSPACE_RESET') return initialAgentWorkspaceRun;
  return reduceLifecycleEvent(state, event) ?? reduceMessageEvent(state, event) ?? reduceInteractionEvent(state, event);
}

function reduceLifecycleEvent(
  state: AgentWorkspaceRunState,
  event: AgentGatewayEvent
): AgentWorkspaceRunState | undefined {
  switch (event.type) {
    case 'RUN_STARTED':
      return { ...state, status: 'running', ...(event.runUid ? { runUid: event.runUid } : {}) };
    case 'RUN_COMPLETED':
      return { ...state, status: 'complete', messages: state.messages.map(item => ({ ...item, status: 'complete' })) };
    case 'ERROR':
      return { ...state, status: 'error', errorMessage: stringField(event.payload, 'errorMessage') };
    default:
      return undefined;
  }
}

function reduceMessageEvent(
  state: AgentWorkspaceRunState,
  event: AgentGatewayEvent
): AgentWorkspaceRunState | undefined {
  const id = event.itemId ?? event.eventId;
  switch (event.type) {
    case 'MESSAGE_STARTED':
      return { ...state, messages: upsertMessage(state.messages, id, '') };
    case 'MESSAGE_DELTA':
      return { ...state, messages: appendMessage(state.messages, id, stringField(event.payload, 'delta')) };
    case 'MESSAGE_COMPLETED':
      return { ...state, messages: completeMessage(state.messages, id) };
    default:
      return undefined;
  }
}

function reduceInteractionEvent(state: AgentWorkspaceRunState, event: AgentGatewayEvent): AgentWorkspaceRunState {
  switch (event.type) {
    case 'TOOL_STARTED':
    case 'TOOL_COMPLETED':
      return { ...state, tools: upsertTool(state.tools, event.payload) };
    case 'APPROVAL_REQUESTED':
    case 'APPROVAL_COMPLETED':
      return { ...state, approvals: upsertApproval(state.approvals, event.payload) };
    case 'INPUT_REQUESTED':
    case 'INPUT_COMPLETED':
      return { ...state, inputs: upsertInput(state.inputs, event.payload) };
    default:
      return state;
  }
}

function upsertMessage(messages: AgentRunMessage[], id: string, text: string) {
  return messages.some(item => item.id === id) ? messages : [...messages, { id, text, status: 'streaming' as const }];
}

function appendMessage(messages: AgentRunMessage[], id: string, delta: string) {
  const current = upsertMessage(messages, id, '');
  return current.map(item => (item.id === id ? { ...item, text: `${item.text}${delta}` } : item));
}

function completeMessage(messages: AgentRunMessage[], id: string) {
  return messages.map(item => (item.id === id ? { ...item, status: 'complete' as const } : item));
}

function upsertTool(tools: AgentToolActivity[], payload: Record<string, unknown>) {
  const toolCallId = stringField(payload, 'toolCallId');
  const elapsedMs = numberField(payload, 'elapsedMs');
  const tool: AgentToolActivity = {
    toolCallId,
    toolName: stringField(payload, 'toolName'),
    status: stringField(payload, 'status'),
    ...(elapsedMs === undefined ? {} : { elapsedMs }),
    ...(stringField(payload, 'errorMessage') ? { errorMessage: stringField(payload, 'errorMessage') } : {})
  };
  return upsertBy(tools, item => item.toolCallId === toolCallId, tool);
}

function upsertApproval(approvals: AgentApproval[], payload: Record<string, unknown>) {
  const approvalId = stringField(payload, 'approvalId');
  const approval: AgentApproval = {
    approvalId,
    toolCallId: stringField(payload, 'toolCallId'),
    toolName: stringField(payload, 'toolName'),
    status: stringField(payload, 'status')
  };
  return upsertBy(approvals, item => item.approvalId === approvalId, approval);
}

function upsertInput(inputs: AgentInputRequest[], payload: Record<string, unknown>) {
  const interactionId = stringField(payload, 'interactionId');
  const fields = Array.isArray(payload.fields)
    ? payload.fields.filter((field): field is Record<string, unknown> => Boolean(field) && typeof field === 'object')
    : [];
  const input: AgentInputRequest = {
    interactionId,
    targetTool: stringField(payload, 'targetTool'),
    title: stringField(payload, 'title'),
    description: stringField(payload, 'description'),
    fields,
    status: stringField(payload, 'status')
  };
  return upsertBy(inputs, item => item.interactionId === interactionId, input);
}

function upsertBy<T>(items: T[], matches: (item: T) => boolean, replacement: T) {
  return items.some(matches) ? items.map(item => (matches(item) ? replacement : item)) : [...items, replacement];
}

function stringField(payload: Record<string, unknown>, field: string) {
  return typeof payload[field] === 'string' ? payload[field] : '';
}

function numberField(payload: Record<string, unknown>, field: string) {
  const value = payload[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
