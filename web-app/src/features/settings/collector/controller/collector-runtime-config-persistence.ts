/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { loadCollectorRuntimeConfig, saveCollectorRuntimeConfig } from '../api/collector-runtime-config-api';
import type { ManagedOtelRuntimeConfig } from '../api/collector-runtime-config-schema';
import { CollectorContractError, type CollectorMutationFailure } from '../model/collector-model';
import { classifyCollectorMutationFailure } from './collector-mutation';
import { sameManagedRuntimeConfig } from './collector-runtime-config-proof';

export async function readCollectorRuntimeConfig(collector: string) {
  try {
    return { config: await loadCollectorRuntimeConfig(collector), failure: null };
  } catch (error) {
    return { config: null, failure: classifyRuntimeFailure(error) };
  }
}

export async function persistCollectorRuntimeConfig(collector: string, request: ManagedOtelRuntimeConfig) {
  try {
    const response = await saveCollectorRuntimeConfig(collector, request);
    const proof = await loadCollectorRuntimeConfig(collector);
    // Both equalities are required so an unchanged server state cannot be reported as a successful write.
    return sameManagedRuntimeConfig(request, response) && sameManagedRuntimeConfig(request, proof)
      ? null
      : ('validation' as const);
  } catch (error) {
    return classifyRuntimeFailure(error);
  }
}

function classifyRuntimeFailure(error: unknown): CollectorMutationFailure {
  return error instanceof CollectorContractError ? 'validation' : classifyCollectorMutationFailure(error);
}
