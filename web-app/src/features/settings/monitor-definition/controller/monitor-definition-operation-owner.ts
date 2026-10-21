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

export type MonitorDefinitionOperationKind = 'detail-load' | 'exclusive-command' | 'catalog-proof';

export type MonitorDefinitionOperation = {
  generation: number;
  kind: MonitorDefinitionOperationKind;
  abort: AbortController;
};

export function createMonitorDefinitionOperationOwner() {
  let generation = 0;
  let active: MonitorDefinitionOperation | null = null;
  const retire = () => {
    // Transport abort is best-effort; generation ownership gates local publication.
    generation += 1;
    active?.abort.abort();
    active = null;
  };
  return {
    begin(kind: MonitorDefinitionOperationKind) {
      retire();
      const operation = { generation, kind, abort: new AbortController() };
      active = operation;
      return operation;
    },
    snapshot() {
      return generation;
    },
    matches(snapshot: number) {
      return snapshot === generation;
    },
    owns(operation: MonitorDefinitionOperation) {
      return active === operation && operation.generation === generation && !operation.abort.signal.aborted;
    },
    complete(operation: MonitorDefinitionOperation) {
      if (active === operation) active = null;
    },
    markCatalogProof(operation: MonitorDefinitionOperation) {
      if (active === operation) operation.kind = 'catalog-proof';
    },
    retire,
    busy() {
      return active !== null;
    },
    closeBlocked() {
      return active?.kind === 'exclusive-command';
    },
    recoveryCancelable() {
      return active?.kind === 'catalog-proof';
    }
  };
}

export type MonitorDefinitionOperationOwner = ReturnType<typeof createMonitorDefinitionOperationOwner>;
