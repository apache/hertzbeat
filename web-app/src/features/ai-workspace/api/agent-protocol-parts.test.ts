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

import { agentGatewayEventSchema, agentProviderConfigurationViewSchema } from './agent-gateway-schema';
import { agentWorkspaceReducer, initialAgentWorkspaceRun } from '../model/agent-workspace-reducer';

describe('Protocol selection and ordered message projection', () => {
  const provider = {
    uid: 'fixture',
    type: 'openai-compatible',
    code: 'fixture',
    baseUrl: null,
    model: null,
    apiKeyConfigured: true
  };
  it('accepts legacy configurations and explicit Responses, rejecting unknown protocols', () => {
    expect(
      agentProviderConfigurationViewSchema.parse({ activeProviderUid: 'fixture', providers: [provider] }).providers[0]
    ).not.toHaveProperty('protocol');
    expect(
      agentProviderConfigurationViewSchema.parse({
        activeProviderUid: 'fixture',
        providers: [{ ...provider, protocol: 'responses' }]
      }).providers[0]?.protocol
    ).toBe('responses');
    expect(() =>
      agentProviderConfigurationViewSchema.parse({
        activeProviderUid: 'fixture',
        providers: [{ ...provider, protocol: 'inferred-from-vendor' }]
      })
    ).toThrow();
  });
  it('keeps validated completion parts in order without exposing opaque or tool inputs', () => {
    const parts = [
      { type: 'text', text: 'before', payload: { private: 'opaque' } },
      { type: 'toolCall', id: 'call-1', name: 'read.fixture', input: { secret: 'fixture' } },
      { type: 'text', text: 'after' }
    ];
    const base = {
      eventId: 'e-1',
      conversationId: 'c-1',
      sessionUid: 's-1',
      runUid: 'r-1',
      itemId: 'm-1',
      timestamp: 1
    };
    const started = agentGatewayEventSchema.parse({ ...base, type: 'MESSAGE_STARTED', payload: {} });
    const state = agentWorkspaceReducer(initialAgentWorkspaceRun, started);
    const complete = agentGatewayEventSchema.parse({ ...base, type: 'MESSAGE_COMPLETED', payload: { parts } });
    const view = agentWorkspaceReducer(state, complete).messages[0];
    expect(view?.parts).toEqual([
      { type: 'text', text: 'before' },
      { type: 'toolCall', id: 'call-1', name: 'read.fixture' },
      { type: 'text', text: 'after' }
    ]);
    expect(JSON.stringify(view)).not.toContain('opaque');
    expect(JSON.stringify(view)).not.toContain('secret');
    expect(() =>
      agentGatewayEventSchema.parse({
        ...base,
        type: 'MESSAGE_COMPLETED',
        payload: { parts: [{ type: 'reasoning', text: 'private' }] }
      })
    ).toThrow();
  });
});
