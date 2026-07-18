/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { isStatusManagementMissing } from '../api/status-management-api';
import { StatusManagementContractError } from '../model/status-management-contract';

export function requireStatusId(id: number | undefined) {
  if (!Number.isSafeInteger(id) || (id ?? 0) < 1) throw new StatusManagementContractError();
  return id as number;
}

export function requireStatusExactId(actual: number, expected: number) {
  if (actual !== expected) throw new StatusManagementContractError();
}

export async function proveStatusMissing(load: () => Promise<unknown>) {
  try {
    await load();
  } catch (error) {
    if (isStatusManagementMissing(error)) return;
    throw error;
  }
  throw new StatusManagementContractError();
}
