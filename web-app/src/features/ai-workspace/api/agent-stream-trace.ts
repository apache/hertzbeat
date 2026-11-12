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

import type { StreamHeaderPhase } from '@/core/http/http-client';
import type { AgentTransportFailure } from '../model/agent-transport-diagnostic';

export function createStreamTrace() {
  const requestId = crypto.randomUUID();
  const began = Date.now();
  let phase: StreamHeaderPhase = 'queued';
  const event = (stage: string, status?: number) => {
    const detail = {
      requestId,
      stage,
      elapsedMs: Math.max(0, Date.now() - began),
      ...(status ? { httpStatus: status } : {})
    };
    try {
      console.info('HB_AGENT_TRANSPORT', JSON.stringify(detail));
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('hertzbeat:agent-transport', { detail }));
    } catch {
      /* Diagnostics cannot affect transport. */
    }
  };
  return {
    requestId,
    event,
    phase: () => phase,
    observe: (next: StreamHeaderPhase) => {
      phase = next;
      event(next);
    },
    failure: (code: AgentTransportFailure['code'], status?: number): AgentTransportFailure => {
      event(code, status);
      return { requestId, code, ...(status ? { httpStatus: status } : {}) };
    }
  };
}

export function headerFailureCode(error: unknown, phase: StreamHeaderPhase): AgentTransportFailure['code'] {
  const name = error && typeof error === 'object' && 'name' in error ? error.name : undefined;
  if (name === 'TimeoutError') return phase === 'queued' ? 'QUEUE_TIMEOUT' : 'HEADER_TIMEOUT';
  return phase === 'queued' ? 'REQUEST_PREPARATION_FAILED' : 'TRANSPORT_FAILURE';
}

export type StreamTrace = ReturnType<typeof createStreamTrace>;
