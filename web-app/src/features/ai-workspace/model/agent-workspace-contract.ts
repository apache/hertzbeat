/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

type AgentMonitorMetricSignal = {
  type: 'metrics';
  query: string;
  start: number;
  end: number;
  timezone: string;
};

export type AgentMonitorMetricSourceTarget = {
  monitorId: number;
  signal: AgentMonitorMetricSignal;
};

type AgentSingleAlertSourceTarget = {
  alertId: number;
  alertType: 'single';
};

type AgentEntitySourceTarget = {
  entityId: number;
};

export type AgentTopologyRef = {
  rootEntityId: number;
  nodeId?: string;
  edgeId?: string;
  depth: 1 | 2;
  environment?: string;
  sourceKind: string;
  start?: number;
  end?: number;
  relationType?: string;
  hideInternal: boolean;
  pageIndex: number;
  pageSize: number;
};

export type AgentTopologySourceTarget = {
  topology: AgentTopologyRef;
};

export type AgentTraceRef = {
  traceId: string;
  spanId?: string;
  start: number;
  end: number;
  serviceName?: string;
  serviceNamespace?: string;
  environment?: string;
  resourceFilter?: string;
  attributeFilter?: string;
  minDurationMs?: number;
  maxDurationMs?: number;
};

export type AgentTraceSourceTarget = {
  trace: AgentTraceRef;
};

export type AgentLogRef = {
  start: number;
  end: number;
  traceId?: string;
  spanId?: string;
  severityNumber?: number;
  severityText?: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  search?: string;
  serviceName?: string;
  serviceNamespace?: string;
  environment?: string;
  resourceFilter?: string;
  attributeFilter?: string;
  hideInternal: boolean;
  hideNoise: boolean;
  pageIndex: number;
  pageSize: number;
};

export type AgentLogSourceTarget = { log: AgentLogRef };

export type AgentSourceTarget =
  | AgentMonitorMetricSourceTarget
  | AgentSingleAlertSourceTarget
  | AgentEntitySourceTarget
  | AgentTopologySourceTarget
  | AgentTraceSourceTarget
  | AgentLogSourceTarget;

type AgentCanonicalMonitorMetricTarget = AgentMonitorMetricSourceTarget & {
  version: string;
  entityId: number;
  service: {
    name: string;
    namespace?: string;
    environment?: string;
  };
};

type AgentCanonicalSingleAlertTarget = AgentSingleAlertSourceTarget & {
  version: string;
};

type AgentCanonicalEntityTarget = AgentEntitySourceTarget & {
  version: string;
};

type AgentCanonicalTopologyTarget = AgentTopologySourceTarget & {
  version: string;
  entityId: number;
};

type AgentCanonicalTraceTarget = AgentTraceSourceTarget & {
  version: string;
};

type AgentCanonicalLogTarget = AgentLogSourceTarget & {
  version: string;
};

type AgentCanonicalTarget =
  | AgentCanonicalMonitorMetricTarget
  | AgentCanonicalSingleAlertTarget
  | AgentCanonicalEntityTarget
  | AgentCanonicalTopologyTarget
  | AgentCanonicalTraceTarget
  | AgentCanonicalLogTarget;

export type AgentTargetRef = AgentSourceTarget | AgentCanonicalTarget;

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
  'RUN_STATUS',
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
  target?: AgentSourceTarget;
  attachments: string[];
  /** Internal transport metadata. The API adapter maps this to Accept-Language and strips it from JSON. */
  preferredLanguage?: string;
};

export type AgentRetryRequest = {
  conversationId: string;
  messageId: string;
  message: string;
  target: AgentSourceTarget | null;
  attachments: string[];
  preferredLanguage: string;
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

export type AgentRunSnapshot = {
  runUid: string;
  sessionUid: string;
  messageId: string;
  status: 'CREATED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'RECOVERY_REQUIRED';
  target: AgentTargetRef | null;
  result: string | null;
  errorMessage: string | null;
  replayAvailable: boolean;
  startedAt: string | null;
  completedAt: string | null;
  retryRequest: AgentRetryRequest | null;
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
