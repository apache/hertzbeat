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
