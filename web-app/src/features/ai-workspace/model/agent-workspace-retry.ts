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

import type { AgentGatewayEvent } from './agent-workspace-contract';
import type { AgentWorkspaceRunState } from './agent-workspace-run-state';

export type { AgentModelRetry } from './agent-workspace-run-state';

/** Records live model retry progress announced by a MODEL_RETRY gateway event. */
export function reduceModelRetry(state: AgentWorkspaceRunState, event: AgentGatewayEvent): AgentWorkspaceRunState {
  const attempt = payloadNumber(event.payload, 'attempt') ?? 1;
  const maxAttempts = Math.max(1, payloadNumber(event.payload, 'maxAttempts') ?? attempt);
  const delayMs = payloadNumber(event.payload, 'delayMs');
  const errorMessage = payloadString(event.payload, 'errorMessage');
  return {
    ...state,
    status: 'running',
    ...(event.runUid ? { runUid: event.runUid } : {}),
    modelRetry: {
      attempt,
      maxAttempts,
      ...(delayMs !== undefined ? { delayMs } : {}),
      ...(errorMessage ? { errorMessage } : {})
    }
  };
}

/** Drops retry progress once the stream makes progress or reaches a terminal state. */
export function clearModelRetry(state: AgentWorkspaceRunState): AgentWorkspaceRunState {
  if (state.modelRetry === undefined) return state;
  const rest = { ...state };
  delete rest.modelRetry;
  return rest;
}

function payloadNumber(payload: Record<string, unknown>, field: string) {
  const value = payload[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function payloadString(payload: Record<string, unknown>, field: string) {
  return typeof payload[field] === 'string' ? payload[field] : '';
}
