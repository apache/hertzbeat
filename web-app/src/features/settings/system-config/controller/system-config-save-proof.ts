/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { RefObject } from 'react';

import type { SystemConfigCanonicalProof } from '../model/system-config-model';
import type {
  SystemConfigSaveOwner,
  SystemConfigSaveReceipt,
  SystemConfigSaveRuntime
} from './system-config-save-runtime';

type CanonicalAdoptionOptions = {
  accept: (record: SystemConfigCanonicalProof['record']) => void;
  notifyFailure: () => void;
};
type CanonicalCompletionOptions = CanonicalAdoptionOptions & { notifySuccess: () => void };

export function acceptSystemConfigCanonicalProof(
  options: CanonicalAdoptionOptions,
  runtime: SystemConfigSaveRuntime,
  canWriteRef: RefObject<boolean>,
  proof: SystemConfigCanonicalProof | null
) {
  if (!isCanonicalProofAvailable(runtime, canWriteRef, proof)) return;
  const owner = runtime.begin('canonical');
  if (!owner) return;
  try {
    if (!runtime.isCurrent(owner) || !isCanonicalProofAvailable(runtime, canWriteRef, proof)) return;
    commitCanonicalProof(options, runtime, owner, proof);
  } finally {
    runtime.finish(owner);
  }
}

function isCanonicalProofAvailable(
  runtime: SystemConfigSaveRuntime,
  canWriteRef: RefObject<boolean>,
  proof: SystemConfigCanonicalProof | null
): proof is SystemConfigCanonicalProof {
  return Boolean(proof && canWriteRef.current && runtime.receiptRef.current?.recovery?.canonicalProof === proof);
}

function commitCanonicalProof(
  options: CanonicalAdoptionOptions,
  runtime: SystemConfigSaveRuntime,
  owner: SystemConfigSaveOwner,
  proof: SystemConfigCanonicalProof
) {
  // This accepts only the typed canonical GET evidence. It never claims the
  // submitted draft converged and never issues another mutation.
  try {
    options.accept(proof.record);
    runtime.publish(owner, null);
  } catch {
    options.notifyFailure();
  }
}

export function withSystemConfigProofRecovery(
  receipt: SystemConfigSaveReceipt,
  canonicalProof: SystemConfigCanonicalProof | null
): SystemConfigSaveReceipt {
  return { ...receipt, recovery: { phase: 'proof', canonicalProof } };
}

export function completeSystemConfigSave(
  options: CanonicalCompletionOptions,
  runtime: SystemConfigSaveRuntime,
  owner: SystemConfigSaveOwner,
  record: SystemConfigCanonicalProof['record']
) {
  runtime.publish(owner, null);
  try {
    options.accept(record);
    options.notifySuccess();
  } catch {
    options.notifyFailure();
  }
}
