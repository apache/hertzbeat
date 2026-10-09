/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
export const LOG_SCOPE_DIMENSIONS = {
  serviceName: 'service.name',
  environment: 'deployment.environment.name'
} as const;
export type LogScopeDimension = keyof typeof LOG_SCOPE_DIMENSIONS;
export type LogScopeSuggestion = { state: 'idle' | 'loading' | 'empty' | 'ready' | 'error'; values: string[] };
export type LogScopeSuggestions = Record<LogScopeDimension, LogScopeSuggestion>;
