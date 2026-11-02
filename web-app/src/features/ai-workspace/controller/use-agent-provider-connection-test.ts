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

import { useCallback, useEffect, useRef, useState } from 'react';

import { cancelAgentProviderTest, testAgentProvider } from '../api/agent-provider-test-api';
import type {
  ProviderConnectionTest,
  ProviderTestResult,
  ProviderTestState
} from '../model/agent-provider-test-contract';
import type { AgentProviderInput } from '../model/agent-workspace-contract';

type PendingTest = { id: string; abort: AbortController; started: number; protocol: string; model: string };
function resultFor(pending: PendingTest, category: ProviderTestResult['category']): ProviderTestResult {
  return {
    protocol: pending.protocol,
    model: pending.model,
    elapsedMs: Math.max(0, Date.now() - pending.started),
    category,
    httpStatus: null
  };
}

export function useAgentProviderConnectionTest(open: boolean): ProviderConnectionTest {
  const [state, setState] = useState<ProviderTestState>({ phase: 'idle' });
  const pending = useRef<PendingTest | null>(null);
  const stop = useCallback(() => {
    const current = pending.current;
    pending.current = null;
    if (current) {
      void cancelAgentProviderTest(current.id).catch(() => undefined);
      current.abort.abort();
    }
    return current;
  }, []);
  const reset = useCallback(() => {
    stop();
    setState({ phase: 'idle' });
  }, [stop]);
  const cancel = useCallback(() => {
    const current = stop();
    if (current) setState({ phase: 'done', result: resultFor(current, 'CANCELLED') });
  }, [stop]);
  const start = useCallback(
    async (input: AgentProviderInput) => {
      if (pending.current) return;
      const current: PendingTest = {
        id: crypto.randomUUID(),
        abort: new AbortController(),
        started: Date.now(),
        protocol: input.protocol ?? 'chat-completions',
        model: input.model ?? ''
      };
      pending.current = current;
      setState({ phase: 'running' });
      const timeout = setTimeout(() => {
        if (pending.current !== current) return;
        stop();
        setState({ phase: 'done', result: resultFor(current, 'TIMEOUT') });
      }, 15000);
      try {
        const result = await testAgentProvider(current.id, input, current.abort.signal);
        if (pending.current === current) setState({ phase: 'done', result });
      } catch {
        if (pending.current === current) setState({ phase: 'done', result: resultFor(current, 'NETWORK') });
      } finally {
        clearTimeout(timeout);
        if (pending.current === current) pending.current = null;
      }
    },
    [stop]
  );
  useEffect(() => {
    if (!open) queueMicrotask(reset);
    return () => {
      stop();
    };
  }, [open, reset, stop]);
  return { state, start, cancel, reset };
}
