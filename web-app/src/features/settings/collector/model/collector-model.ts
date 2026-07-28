/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { CollectorInstrumentationIntake } from '@/shared/collector';
import type { CollectorRuntimeReport } from './collector-runtime-report-model';

export const immutableCollectorName = 'main-default-collector';

export type CollectorRecord = {
  name: string;
  address: string;
  version: string | null;
  mode: string | null;
  online: boolean;
  immutable: boolean;
  pinMonitorNum: number;
  dispatchMonitorNum: number;
  updatedAt: string | null;
  runtimeReport: CollectorRuntimeReport | null;
  instrumentationIntake: CollectorInstrumentationIntake;
};

export type CollectorPage = {
  content: CollectorRecord[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export type CollectorListState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'permission' }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | { kind: 'ready'; records: CollectorRecord[]; total: number };

export type CollectorMutationAction = 'online' | 'offline' | 'delete';
export type CollectorMutationCommand = { action: CollectorMutationAction; collectors: string[] };
export type CollectorMutationFailure = 'permission' | 'validation' | 'unavailable' | 'error';

export class CollectorContractError extends Error {
  constructor() {
    super('Collector response was invalid');
    this.name = 'CollectorContractError';
  }
}
