/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { QueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';

import { createSessionQueryClient } from '@/core/auth/session-cache-boundary';
import type { UiSession } from '@/core/auth/session-api';
import { SessionIdentityProvider } from '@/core/auth/session-identity-provider';

export type SessionQueryRuntimeValue = {
  generation: number;
  queryClient: QueryClient;
};

type SessionQueryRuntimeProps = {
  children: (runtime: SessionQueryRuntimeValue) => ReactNode;
  createQueryClient: () => QueryClient;
};

export function SessionQueryRuntime({ children, createQueryClient }: SessionQueryRuntimeProps) {
  const [runtime, setRuntime] = useState<SessionQueryRuntimeValue>(() => ({
    generation: 0,
    queryClient: createQueryClient()
  }));
  const runtimeRef = useRef(runtime);
  const replaceIdentity = useCallback(
    (nextSession: UiSession) => {
      const previousClient = runtimeRef.current.queryClient;
      const nextRuntime = {
        generation: runtimeRef.current.generation + 1,
        queryClient: createSessionQueryClient(createQueryClient, nextSession)
      };

      // Synchronous detachment prevents previous-generation mutation callbacks
      // from becoming visible before React mounts the isolated client.
      flushSync(() => {
        runtimeRef.current = nextRuntime;
        setRuntime(nextRuntime);
      });
      previousClient.clear();
    },
    [createQueryClient]
  );

  return <SessionIdentityProvider replaceIdentity={replaceIdentity}>{children(runtime)}</SessionIdentityProvider>;
}
