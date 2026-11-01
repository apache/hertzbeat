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

import type { AgentApproval, AgentInputRequest, AgentToolActivity, AgentWorkspaceRunState } from './agent-run-state';
import type { AgentGatewayEvent } from './agent-workspace-contract';
import { clearModelRetry } from './agent-workspace-retry';
import type { AgentRunMessage } from './agent-run-message';
import type { AgentMessagePart } from './agent-message-parts';
import { isAgentApprovalSummary } from './agent-approval-summary';
import { agentToolIsTerminal, agentToolStatus } from './agent-runtime-status';

export function recoverApprovals(state: AgentWorkspaceRunState, payload: Record<string, unknown>) {
  if (Array.isArray(payload.recoveredApprovals)) {
    const approvals = payload.recoveredApprovals.filter(
      (item: unknown): item is Record<string, unknown> =>
        item !== null &&
        typeof item === 'object' &&
        'approvalId' in item &&
        'toolCallId' in item &&
        'toolName' in item &&
        'status' in item &&
        'canDecide' in item &&
        typeof item.approvalId === 'string' &&
        typeof item.toolCallId === 'string' &&
        typeof item.toolName === 'string' &&
        typeof item.status === 'string' &&
        typeof item.canDecide === 'boolean'
    );
    state = { ...state, approvals: approvals.reduce(upsertApproval, [] as AgentApproval[]) };
    for (const approval of state.approvals) {
      if (approval.canDecide && ['WAITING_APPROVAL', 'PENDING'].includes(approval.status)) {
        state = {
          ...state,
          tools: upsertTool(state.tools, {
            toolCallId: approval.toolCallId,
            toolName: approval.toolName,
            status: 'WAITING_APPROVAL'
          })
        };
      }
    }
  }
  if (typeof payload.approvalRecoveryUnavailable === 'boolean') {
    state = { ...state, approvalRecoveryUnavailable: payload.approvalRecoveryUnavailable };
  }
  return state;
}

export function reduceMessageEvent(
  state: AgentWorkspaceRunState,
  event: AgentGatewayEvent
): AgentWorkspaceRunState | undefined {
  const id = event.itemId ?? event.eventId;
  switch (event.type) {
    case 'MESSAGE_STARTED':
      return { ...clearModelRetry(state), messages: upsertMessage(state.messages, id, '') };
    case 'MESSAGE_DELTA':
      return { ...state, messages: appendMessage(state.messages, id, stringField(event.payload, 'delta')) };
    case 'MESSAGE_COMPLETED':
      return { ...state, messages: completeMessage(state.messages, id, event.messageParts) };
    default:
      return undefined;
  }
}

export function reduceInteractionEvent(
  state: AgentWorkspaceRunState,
  event: AgentGatewayEvent
): AgentWorkspaceRunState {
  switch (event.type) {
    case 'TOOL_STARTED':
      if (isLateActivity(state, event)) return state;
      return { ...state, tools: upsertTool(state.tools, event.payload) };
    case 'TOOL_COMPLETED':
      return { ...state, tools: upsertTool(state.tools, event.payload) };
    case 'APPROVAL_REQUESTED':
      return isLateActivity(state, event) ? state : requestedApproval(state, event.payload);
    case 'APPROVAL_COMPLETED':
      return { ...state, approvals: upsertApproval(state.approvals, event.payload) };
    case 'INPUT_REQUESTED':
    case 'INPUT_COMPLETED':
      return { ...state, inputs: upsertInput(state.inputs, event.payload) };
    default:
      return state;
  }
}

function isLateActivity(state: AgentWorkspaceRunState, event: AgentGatewayEvent) {
  return Boolean(state.runUid && state.runUid === event.runUid && ['error', 'complete'].includes(state.status));
}

function requestedApproval(state: AgentWorkspaceRunState, payload: Record<string, unknown>) {
  const id = stringField(payload, 'toolCallId');
  const name = stringField(payload, 'toolName');
  return {
    ...state,
    approvals: upsertApproval(state.approvals, payload),
    ...(id && name
      ? { tools: upsertTool(state.tools, { toolCallId: id, toolName: name, status: 'WAITING_APPROVAL' }) }
      : {})
  };
}

function upsertMessage(messages: AgentRunMessage[], id: string, text: string) {
  return messages.some(item => item.id === id) ? messages : [...messages, { id, text, status: 'streaming' as const }];
}

function appendMessage(messages: AgentRunMessage[], id: string, delta: string) {
  const current = upsertMessage(messages, id, '');
  return current.map(item => (item.id === id ? { ...item, text: `${item.text}${delta}` } : item));
}

function completeMessage(messages: AgentRunMessage[], id: string, parts?: AgentMessagePart[]) {
  return messages.map(item =>
    item.id === id ? { ...item, ...(parts ? { parts } : {}), status: 'complete' as const } : item
  );
}

function upsertTool(tools: AgentToolActivity[], payload: Record<string, unknown>) {
  const toolCallId = stringField(payload, 'toolCallId');
  const elapsedMs = numberField(payload, 'elapsedMs');
  const tool: AgentToolActivity = {
    toolCallId,
    toolName: stringField(payload, 'toolName'),
    status: agentToolStatus(stringField(payload, 'status'), stringField(payload, 'errorMessage')),
    ...(elapsedMs === undefined ? {} : { elapsedMs }),
    ...(stringField(payload, 'errorMessage') ? { errorMessage: stringField(payload, 'errorMessage') } : {})
  };
  const previous = tools.find(item => item.toolCallId === toolCallId);
  if (previous && agentToolIsTerminal(previous.status) && ['RUNNING', 'WAITING_APPROVAL'].includes(tool.status))
    return tools;
  return upsertBy(tools, item => item.toolCallId === toolCallId, tool);
}

function upsertApproval(approvals: AgentApproval[], payload: Record<string, unknown>) {
  const approvalId = stringField(payload, 'approvalId');
  const approval: AgentApproval = {
    approvalId,
    ...(isAgentApprovalSummary(payload.summary) ? { summary: payload.summary } : {}),
    ...(typeof payload.canDecide === 'boolean' ? { canDecide: payload.canDecide } : {}),
    toolCallId: stringField(payload, 'toolCallId'),
    toolName: stringField(payload, 'toolName'),
    status: stringField(payload, 'status').toUpperCase()
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
    status: stringField(payload, 'status').toUpperCase()
  };
  return upsertBy(inputs, item => item.interactionId === interactionId, input);
}

function upsertBy<T>(items: T[], matches: (item: T) => boolean, replacement: T) {
  return items.some(matches) ? items.map(item => (matches(item) ? replacement : item)) : [...items, replacement];
}

export function stringField(payload: Record<string, unknown>, field: string) {
  return typeof payload[field] === 'string' ? payload[field] : '';
}

function numberField(payload: Record<string, unknown>, field: string) {
  const value = payload[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function stopUnresolvedTools(tools: AgentToolActivity[]) {
  // Run cancellation alone cannot prove that a previously executing write had no effects.
  return tools.map(tool =>
    ['RUNNING', 'WAITING_APPROVAL'].includes(tool.status) ? { ...tool, status: 'UNKNOWN' } : tool
  );
}
