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
