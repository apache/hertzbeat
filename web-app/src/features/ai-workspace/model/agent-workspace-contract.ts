/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export type AgentSignalRef = {
  type: 'metrics' | 'logs' | 'traces';
  query?: string;
  timeRange?: string;
  start?: number;
  end?: number;
};

export type AgentTopologyRef = {
  rootEntityId?: number;
  nodeId?: string;
  edgeId?: string;
  depth?: number;
};

export type AgentTargetRef = {
  monitorId?: number;
  alertId?: number;
  entityId?: number;
  collector?: string;
  signal?: AgentSignalRef;
  topology?: AgentTopologyRef;
};

export const agentGatewayEventTypes = [
  'RUN_STARTED',
  'MESSAGE_STARTED',
  'MESSAGE_DELTA',
  'MESSAGE_COMPLETED',
  'TOOL_STARTED',
  'TOOL_COMPLETED',
  'INPUT_REQUESTED',
  'INPUT_COMPLETED',
  'APPROVAL_REQUESTED',
  'APPROVAL_COMPLETED',
  'RUN_COMPLETED',
  'ERROR'
] as const;

export type AgentGatewayEvent = {
  type: (typeof agentGatewayEventTypes)[number];
  eventId: string;
  conversationId: string | null;
  sessionUid: string | null;
  runUid: string | null;
  itemId: string | null;
  payload: Record<string, unknown>;
  timestamp: number;
};

export type AgentChatRequest = {
  conversationId: string;
  messageId: string;
  message: string;
  target?: AgentTargetRef;
  attachments: string[];
};

export type AgentSession = {
  id: number;
  sessionUid: string;
  conversationId: string | null;
  status: string;
  title: string | null;
  gmtCreate: string | null;
  gmtUpdate: string | null;
};

export type AgentTranscriptMessage = {
  id: number;
  sequence: number;
  role: 'user' | 'assistant' | 'toolResult' | 'compactionSummary';
  text: string;
  toolName?: string;
  errorMessage?: string;
  createdAt: string | null;
};

export type AgentProviderOption = {
  type: string;
  code: string;
  label: string;
  defaultBaseUrl: string | null;
  defaultModel: string | null;
  requiredFields: string[];
};

export type AgentProviderConfiguration = {
  uid: string;
  type: string;
  code: string;
  baseUrl: string | null;
  model: string | null;
  apiKeyConfigured: boolean;
};

export type AgentProviderConfigurationView = {
  activeProviderUid: string | null;
  providers: AgentProviderConfiguration[];
};

export type AgentProviderInput = {
  uid?: string;
  type: string;
  code: string;
  baseUrl: string;
  model: string;
  apiKey?: string;
};
