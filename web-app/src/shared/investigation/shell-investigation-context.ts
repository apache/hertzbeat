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
