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
import { discoverAgentProviderModels } from '../api/agent-provider-models-api';
import type { AgentProviderInput, AgentProviderModelCatalog } from '../model/agent-provider-contract';

export function useAgentProviderModels() {
  const request = useRef<AbortController>();
  const [modelCatalog, setCatalog] = useState<AgentProviderModelCatalog>();
  const [modelsLoading, setLoading] = useState(false);
  const clearModels = useCallback(() => {
    request.current?.abort();
    request.current = undefined;
    setCatalog(undefined);
    setLoading(false);
  }, []);
  useEffect(
    () => () => {
      request.current?.abort();
      request.current = undefined;
    },
    []
  );
  const discoverModels = useCallback(
    async (input: AgentProviderInput) => {
      clearModels();
      const current = new AbortController();
      request.current = current;
      setLoading(true);
      try {
        const result = await discoverAgentProviderModels(input, current.signal);
        if (request.current === current) setCatalog(result);
      } catch {
        if (request.current === current) setCatalog({ status: 'unavailable', models: [], truncated: false });
      } finally {
        if (request.current === current) {
          request.current = undefined;
          setLoading(false);
        }
      }
    },
    [clearModels]
  );
  return { discoverModels, clearModels, state: { ...(modelCatalog ? { modelCatalog } : {}), modelsLoading } };
}
