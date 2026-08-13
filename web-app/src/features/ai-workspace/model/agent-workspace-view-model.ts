/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type {
  AgentProviderConfigurationView,
  AgentProviderInput,
  AgentProviderOption,
  AgentSession,
  AgentTargetRef,
  AgentTranscriptMessage
} from './agent-workspace-contract';
import type { AgentWorkspaceRunState } from './agent-workspace-reducer';

type AgentLoadable<T> = { status: 'loading' | 'ready' | 'error'; items: T[] };
export type AgentDraftMessage = { id: string; role: 'user'; text: string };

export type AgentWorkspaceViewModel = {
  sessions: AgentLoadable<AgentSession>;
  selectedSessionUid?: string;
  transcript: AgentLoadable<AgentTranscriptMessage>;
  draftMessages: AgentDraftMessage[];
  run: AgentWorkspaceRunState;
  target?: AgentTargetRef;
  composer: string;
  streaming: boolean;
  stopping: boolean;
  failure?: 'unavailable';
  actions: {
    selectSession: (sessionUid: string) => void;
    newInvestigation: () => void;
    setComposer: (value: string) => void;
    send: () => Promise<void>;
    stop: () => Promise<void>;
    retry: () => Promise<void>;
    decideApproval: (approvalId: string, decision: 'approve' | 'reject') => Promise<void>;
    submitInteraction: (interactionId: string, values: Record<string, unknown>) => Promise<void>;
  };
};

export type AgentProviderViewModel = {
  options: AgentProviderOption[];
  view?: AgentProviderConfigurationView;
  phase: 'loading' | 'ready' | 'saving' | 'error';
  actions: {
    reload: () => Promise<void>;
    create: (input: AgentProviderInput) => Promise<boolean>;
    update: (providerUid: string, input: AgentProviderInput) => Promise<boolean>;
    delete: (providerUid: string) => Promise<void>;
    activate: (providerUid: string) => Promise<void>;
    activateDefault: () => Promise<void>;
  };
};
