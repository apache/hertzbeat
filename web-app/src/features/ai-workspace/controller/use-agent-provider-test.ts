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

import { useCallback, useRef, useState } from 'react';
import { testAgentProvider } from '../api/agent-provider-test-api';
import type { AgentProviderTestResult } from '../model/agent-provider-contract';

export function useAgentProviderTest() {
  const generation = useRef(0);
  const [testResult, setResult] = useState<AgentProviderTestResult>();
  const [testingUid, setUid] = useState<string>();
  const [testFailed, setFailed] = useState(false);
  const clear = useCallback(() => {
    generation.current += 1;
    setUid(undefined);
    setResult(undefined);
    setFailed(false);
  }, []);
  const test = useCallback(
    async (uid: string) => {
      clear();
      const current = generation.current;
      setUid(uid);
      try {
        const result = await testAgentProvider(uid);
        if (current === generation.current) setResult(result);
      } catch {
        if (current === generation.current) setFailed(true);
      } finally {
        if (current === generation.current) setUid(undefined);
      }
    },
    [clear]
  );
  return {
    clear,
    test,
    state: { ...(testResult ? { testResult } : {}), ...(testingUid ? { testingUid } : {}), testFailed }
  };
}
