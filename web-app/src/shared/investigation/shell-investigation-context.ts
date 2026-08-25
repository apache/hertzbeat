/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { createContext } from 'react';

export type TraceInvestigationTarget = {
  trace: {
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
};

export type LogInvestigationTarget = {
  log: {
    start: number;
    end: number;
    traceId?: string;
    spanId?: string;
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
};

export type ShellInvestigationTarget = TraceInvestigationTarget | LogInvestigationTarget;

export type ShellInvestigationContextValue = {
  target: ShellInvestigationTarget | undefined;
  publish: (target: ShellInvestigationTarget | undefined) => void;
};

export const ShellInvestigationContext = createContext<ShellInvestigationContextValue | undefined>(undefined);
