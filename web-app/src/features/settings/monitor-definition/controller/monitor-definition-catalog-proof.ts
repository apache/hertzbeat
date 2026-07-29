/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
