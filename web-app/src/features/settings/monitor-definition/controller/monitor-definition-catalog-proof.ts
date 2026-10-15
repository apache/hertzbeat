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

import { MonitorDefinitionRequestError } from '../api/monitor-definition-api';
import type { MonitorDefinitionCatalog } from '../model/monitor-definition-model';
import type { MonitorDefinitionOperation, MonitorDefinitionOperationOwner } from './monitor-definition-operation-owner';

export type MonitorDefinitionCatalogProof = {
  load: (signal: AbortSignal) => Promise<MonitorDefinitionCatalog>;
  publish: (catalog: MonitorDefinitionCatalog) => void;
};

export function monitorDefinitionWriteNeedsCatalogProof(error: unknown) {
  return error instanceof MonitorDefinitionRequestError && error.writeOutcome === 'uncertain';
}

export async function proveOwnedMonitorDefinitionCatalog(
  proof: MonitorDefinitionCatalogProof,
  operation: MonitorDefinitionOperation,
  owner: MonitorDefinitionOperationOwner
) {
  try {
    const catalog = await proof.load(operation.abort.signal);
    if (owner.owns(operation)) proof.publish(catalog);
  } catch {
    // The original write failure remains the authoritative UI failure.
  }
}
