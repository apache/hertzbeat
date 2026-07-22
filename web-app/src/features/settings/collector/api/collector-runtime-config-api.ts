/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { apiMessageGet, apiMessagePut } from '@/core/http/api-message';

import { CollectorContractError } from '../model/collector-model';
import { collectorEndpoint, normalizeCollectorId } from './collector-management-api';
import { parseManagedOtelRuntimeConfig } from './collector-runtime-config-schema';

export async function loadCollectorRuntimeConfig(collector: string) {
  const value = await apiMessageGet(runtimeConfigPath(normalizeCollectorId(collector)));
  return requireRuntimeConfig(value);
}

export async function saveCollectorRuntimeConfig(collector: string, request: unknown) {
  const collectorId = normalizeCollectorId(collector);
  const config = requireCurrentRuntimeConfig(request);
  const value = await apiMessagePut(runtimeConfigPath(collectorId), config);
  return requireCurrentRuntimeConfig(value);
}

function runtimeConfigPath(collectorId: string) {
  return `${collectorEndpoint}/${encodeURIComponent(collectorId)}/runtime-config`;
}

function requireRuntimeConfig(value: unknown) {
  const config = parseManagedOtelRuntimeConfig(value);
  if (!config) throw new CollectorContractError();
  return config;
}

function requireCurrentRuntimeConfig(value: unknown) {
  const config = requireRuntimeConfig(value);
  if (config.schemaVersion !== 3) throw new CollectorContractError();
  return config;
}
