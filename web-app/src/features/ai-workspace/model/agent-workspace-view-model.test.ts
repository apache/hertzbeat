/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import type { AgentTranscriptMessage } from './agent-workspace-contract';
import { initialAgentWorkspaceRun } from './agent-workspace-reducer';
import { withTranscriptTools } from './agent-workspace-view-model';

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
