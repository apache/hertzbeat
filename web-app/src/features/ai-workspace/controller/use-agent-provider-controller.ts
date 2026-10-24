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

import { useAgentProviderTest } from './use-agent-provider-test';
import { useAgentProviderModels } from './use-agent-provider-models';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  activateAgentProvider,
  activateDefaultAgentProvider,
  createAgentProvider,
  deleteAgentProvider,
  listAgentProviderConfigurations,
  listAgentProviderOptions,
  updateAgentProvider
} from '../api/agent-gateway-api';
import type {
  AgentProviderConfigurationView,
  AgentProviderInput,
  AgentProviderOption
} from '../model/agent-workspace-contract';
import type { AgentProviderViewModel } from '../model/agent-workspace-view-model';

export function useAgentProviderController(open: boolean): AgentProviderViewModel {
  const { clear, test, state: testingState } = useAgentProviderTest();
  const { clearModels, discoverModels, state: modelState } = useAgentProviderModels();
  const [options, setOptions] = useState<AgentProviderOption[]>([]);
  const [view, setView] = useState<AgentProviderConfigurationView>();
  const [phase, setPhase] = useState<AgentProviderViewModel['phase']>('loading');

  const load = useCallback(async () => {
    setPhase('loading');
    setView(undefined);
    clear();
    clearModels();
    try {
      const [nextOptions, nextView] = await Promise.all([
        listAgentProviderOptions(),
        listAgentProviderConfigurations()
      ]);
      setOptions(nextOptions);
      setView(nextView);
      setPhase('ready');
    } catch {
      setPhase('error');
    }
  }, [clear, clearModels]);

  useProviderDialogReload(open, load);

  const mutate = useCallback(
    async (action: () => Promise<AgentProviderConfigurationView>) => {
      setPhase('saving');
      clear();
      clearModels();
      try {
        setView(await action());
        setPhase('ready');
        return true;
      } catch {
        setPhase('error');
        return false;
      }
    },
    [clear, clearModels]
  );

  const actions = useMemo<AgentProviderViewModel['actions']>(
    () => ({
      reload: load,
      test: test,
      clearModels,
      discoverModels,
      create: input => mutate(() => createAgentProvider(input)),
      update: (providerUid: string, input: AgentProviderInput) => mutate(() => updateAgentProvider(providerUid, input)),
      delete: providerUid => discardResult(mutate(() => deleteAgentProvider(providerUid))),
      activate: providerUid => discardResult(mutate(() => activateAgentProvider(providerUid))),
      activateDefault: () => discardResult(mutate(activateDefaultAgentProvider))
    }),
    [load, mutate, test, clearModels, discoverModels]
  );

  return { options, ...(view ? { view } : {}), phase, actions, ...testingState, ...modelState };
}

async function discardResult(action: Promise<boolean>): Promise<void> {
  await action;
}

function useProviderDialogReload(open: boolean, load: () => Promise<void>) {
  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load, open]);
}
