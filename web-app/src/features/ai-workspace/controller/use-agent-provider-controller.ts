/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
  const [options, setOptions] = useState<AgentProviderOption[]>([]);
  const [view, setView] = useState<AgentProviderConfigurationView>();
  const [phase, setPhase] = useState<AgentProviderViewModel['phase']>('loading');

  const load = useCallback(async () => {
    setPhase('loading');
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
  }, []);

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

  const mutate = useCallback(async (action: () => Promise<AgentProviderConfigurationView>) => {
    setPhase('saving');
    try {
      setView(await action());
      setPhase('ready');
      return true;
    } catch {
      setPhase('error');
      return false;
    }
  }, []);

  const actions = useMemo<AgentProviderViewModel['actions']>(
    () => ({
      reload: load,
      create: input => mutate(() => createAgentProvider(input)),
      update: (providerUid: string, input: AgentProviderInput) => mutate(() => updateAgentProvider(providerUid, input)),
      delete: async providerUid => {
        await mutate(() => deleteAgentProvider(providerUid));
      },
      activate: async providerUid => {
        await mutate(() => activateAgentProvider(providerUid));
      },
      activateDefault: async () => {
        await mutate(activateDefaultAgentProvider);
      }
    }),
    [load, mutate]
  );

  return { options, ...(view ? { view } : {}), phase, actions };
}
