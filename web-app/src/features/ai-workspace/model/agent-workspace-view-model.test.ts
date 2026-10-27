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

import { describe, expect, it } from 'vitest';

import type { AgentTranscriptMessage } from './agent-workspace-contract';
import { initialAgentWorkspaceRun } from './agent-workspace-reducer';
import { isCancelledBeforeApprovalOnly, withTranscriptTools } from './agent-workspace-view-model';

const call: AgentTranscriptMessage = {
  id: 1,
  sequence: 1,
  role: 'assistant',
  text: '',
  toolCalls: [{ toolCallId: 'call-1', toolName: 'logs.query' }],
  createdAt: null
};
const result: AgentTranscriptMessage = {
  id: 2,
  sequence: 2,
  role: 'toolResult',
  text: '{"content":[]}',
  toolCallId: 'call-1',
  toolName: 'logs.query',
  createdAt: null
};

describe('AI workspace recorded tool projection', () => {
  it('restores explicit persisted status and duration without changing legacy results', () => {
    const persisted = { ...result, toolStatus: 'FAILED' as const, toolElapsedMs: 17, errorMessage: 'Invalid range' };
    const projected = withTranscriptTools(initialAgentWorkspaceRun, { status: 'ready', items: [call, persisted] });
    expect(projected.tools).toEqual([
      { toolCallId: 'call-1', toolName: 'logs.query', status: 'FAILED', elapsedMs: 17, errorMessage: 'Invalid range' }
    ]);
  });

  it('joins persisted calls/results without inventing execution status or duration', () => {
    const projected = withTranscriptTools(initialAgentWorkspaceRun, { status: 'ready', items: [call, result] });
    expect(projected.tools).toEqual([{ toolCallId: 'call-1', toolName: 'logs.query', status: 'UNKNOWN' }]);
    expect(initialAgentWorkspaceRun.tools).toEqual([]);
    expect(call.toolCalls).toHaveLength(1);
  });

  it('preserves exact recorded errors and keeps missing results unknown', () => {
    const projected = withTranscriptTools(initialAgentWorkspaceRun, {
      status: 'error',
      items: [
        call,
        { ...result, errorMessage: 'The request was declined.' },
        {
          ...call,
          id: 3,
          toolCalls: [{ toolCallId: 'call-2', toolName: 'tool.search' }]
        }
      ]
    });
    expect(projected.tools).toEqual([
      { toolCallId: 'call-1', toolName: 'logs.query', status: 'UNKNOWN', errorMessage: 'The request was declined.' },
      { toolCallId: 'call-2', toolName: 'tool.search', status: 'UNKNOWN' }
    ]);
  });

  it('lets exact live evidence override its recorded call without duplicating it', () => {
    const live = {
      toolCallId: 'call-1',
      toolName: 'logs.query',
      status: 'FAILED',
      elapsedMs: 23,
      errorMessage: 'Unavailable'
    };
    expect(
      withTranscriptTools(
        { ...initialAgentWorkspaceRun, tools: [live] },
        {
          status: 'ready',
          items: [call, result]
        }
      ).tools
    ).toEqual([live]);
  });

  it('does not attribute the previous transcript to a loading or empty selection', () => {
    expect(withTranscriptTools(initialAgentWorkspaceRun, { status: 'loading', items: [call, result] }).tools).toEqual(
      []
    );
    expect(withTranscriptTools(initialAgentWorkspaceRun, { status: 'ready', items: [] }).tools).toEqual([]);
  });

  it('retains legacy result entries without call IDs as separate recorded evidence', () => {
    const legacy = { ...result };
    delete legacy.toolCallId;
    expect(
      withTranscriptTools(initialAgentWorkspaceRun, {
        status: 'ready',
        items: [legacy, { ...legacy, id: 3 }]
      }).tools.map(tool => tool.toolCallId)
    ).toEqual(['transcript:2:result', 'transcript:3:result']);
  });
});

describe('Durable cancellation evidence', () => {
  it.each(['RUNNING', 'WAITING_APPROVAL', 'UNKNOWN'])(
    'persisted not-executed proof overrides stale %s activity',
    status => {
      const persisted = {
        ...result,
        recordedRunUid: 'same-run',
        toolStatus: 'DENIED' as const,
        errorMessage: 'CANCELLED_BEFORE_APPROVAL_NOT_EXECUTED'
      };
      const live = { toolCallId: 'call-1', toolName: 'logs.query', status };
      const projection = withTranscriptTools(
        { ...initialAgentWorkspaceRun, runUid: 'same-run', tools: [live] },
        { status: 'ready', items: [call, persisted] }
      );
      expect(projection.tools).toHaveLength(1);
      expect(projection.tools[0]?.status).toBe('CANCELLED');
    }
  );
  it('does not overwrite recorded successful execution with stale active activity', () => {
    const persisted = { ...result, recordedRunUid: 'same-run', toolStatus: 'SUCCEEDED' as const };
    const projection = withTranscriptTools(
      {
        ...initialAgentWorkspaceRun,
        runUid: 'same-run',
        tools: [{ toolCallId: 'call-1', toolName: 'logs.query', status: 'RUNNING' }]
      },
      { status: 'ready', items: [call, persisted] }
    );
    expect(projection.tools[0]?.status).toBe('SUCCEEDED');
  });
  it.each([undefined, 'previous-run'])(
    'legacy or other-run result %s cannot override current active tool ID reuse',
    recordedRunUid => {
      const persisted = {
        ...result,
        ...(recordedRunUid ? { recordedRunUid } : {}),
        toolStatus: 'DENIED' as const,
        errorMessage: 'CANCELLED_BEFORE_APPROVAL_NOT_EXECUTED'
      };
      const projection = withTranscriptTools(
        {
          ...initialAgentWorkspaceRun,
          runUid: 'new-run',
          tools: [{ toolCallId: 'call-1', toolName: 'logs.query', status: 'RUNNING' }]
        },
        { status: 'ready', items: [call, persisted] }
      );
      expect(projection.tools[0]?.status).toBe('RUNNING');
    }
  );
});

describe('Cancellation summary proof scope', () => {
  const proof = 'CANCELLED_BEFORE_APPROVAL_NOT_EXECUTED';
  function run() {
    return {
      ...initialAgentWorkspaceRun,
      runUid: 'current',
      cancelled: true,
      tools: [
        { recordedRunUid: 'current', toolCallId: 'read', toolName: 'alert_inhibit.get', status: 'SUCCEEDED' },
        {
          recordedRunUid: 'current',
          toolCallId: 'cancel',
          toolName: 'alert_inhibit.update',
          status: 'CANCELLED',
          errorMessage: proof
        }
      ],
      executionSummary: {
        status: 'PARTIAL' as const,
        totalAttempts: 2,
        succeededAttempts: 1,
        failedAttempts: 1,
        recoveredAttempts: 0,
        unresolvedAttempts: 1,
        unfinishedAttempts: 0,
        truncated: false,
        failures: [
          {
            toolCallId: 'cancel',
            toolName: 'alert_inhibit.update',
            status: 'DENIED' as const,
            errorMessage: proof,
            recovery: 'UNRESOLVED' as const,
            laterSuccessToolCallId: null
          }
        ]
      }
    };
  }
  it('recognizes exact current-run approval cancellation while retaining the original ledger', () => {
    const state = run();
    expect(isCancelledBeforeApprovalOnly(state)).toBe(true);
    expect(state.executionSummary.status).toBe('PARTIAL');
    state.tools.push({
      recordedRunUid: 'previous',
      toolCallId: 'older',
      toolName: 'monitor.create',
      status: 'SUCCEEDED'
    });
    expect(isCancelledBeforeApprovalOnly(state)).toBe(true);
  });
  it.each(['monitor.create', 'alert_inhibit.update', 'unfamiliar.tool'])(
    'does not erase a successful %s operation',
    name => {
      const state = run();
      state.tools[0]!.toolName = name;
      expect(isCancelledBeforeApprovalOnly(state)).toBe(false);
    }
  );
  it.each(['FAILED', 'UNKNOWN', 'RUNNING', 'DENIED'])('preserves %s and ordinary rejection', status => {
    const state = run();
    state.tools[1]!.status = status;
    expect(isCancelledBeforeApprovalOnly(state)).toBe(false);
  });
  it('rejects legacy, cross-run, incomplete, non-cancelled and truncated proof', () => {
    for (const key of ['legacy', 'cross', 'incomplete', 'active', 'truncated']) {
      const state = run();
      if (key === 'legacy') state.tools[1]!.recordedRunUid = '';
      if (key === 'cross') state.tools[1]!.recordedRunUid = 'other';
      if (key === 'incomplete') state.executionSummary.totalAttempts = 3;
      if (key === 'active') state.cancelled = false;
      if (key === 'truncated') state.executionSummary.truncated = true;
      expect(isCancelledBeforeApprovalOnly(state)).toBe(false);
    }
  });
});
