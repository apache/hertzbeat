/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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

import { ApiMessageError } from '@/core/http/api-message';
import { apiMessageWriteOutcome } from '@/core/http/api-message-write-evidence';

import {
  classifyMonitorReadError,
  loadMonitorDetail,
  loadNewMonitorEvidence,
  loadNewMonitorIdentitySnapshot,
  saveMonitor
} from '../api/monitor-api';
import type { MonitorDetail } from '../model/monitor-contract';
import { monitorWritableConverged } from '../model/monitor-editor-convergence';
import type { buildMonitorPayload } from '../model/monitor-editor-payload';
import {
  invalidMonitorWriteEvidence,
  unavailableMonitorWrite,
  verifiedMonitorWrite
} from '../model/monitor-write-verification';
import type { MonitorEditorCommandInput } from './monitor-editor-command-model';
import { markAcknowledgedMonitorSave } from './monitor-editor-save-completion';

/** Persists one frozen payload, then verifies it with canonical read-back evidence. */
export async function saveAndVerifyMonitor(
  input: MonitorEditorCommandInput,
  payload: ReturnType<typeof buildMonitorPayload>,
  signal: AbortSignal,
  ownsOperation: () => boolean
) {
  const editId = input.mode === 'edit' ? input.id : undefined;
  if (input.mode === 'edit' && editId === undefined) return invalidMonitorWriteEvidence<MonitorDetail>();
  // A read-back after an uncertain create can only prove this write when the
  // matching id did not already exist before dispatch.
  const preWriteIds =
    input.mode === 'new'
      ? await captureNewMonitorIdentitySnapshot(payload.monitor.name ?? '', payload.monitor.app ?? '', signal)
      : undefined;
  try {
    await saveMonitor(input.mode, payload, signal);
  } catch (error) {
    return reconcileUncertainMonitorCreate(input, payload, error, signal, ownsOperation, preWriteIds);
  }
  // A successful write remains authoritative even if proof is later cancelled or unavailable.
  markAcknowledgedMonitorSave(input);
  if (!ownsOperation() || signal.aborted) return undefined;
  return readMonitorWriteVerification(input, payload, editId, signal, preWriteIds);
}

async function readMonitorWriteVerification(
  input: MonitorEditorCommandInput,
  payload: ReturnType<typeof buildMonitorPayload>,
  editId: number | undefined,
  signal: AbortSignal,
  preWriteIds?: ReadonlySet<number>
) {
  let proof: MonitorDetail;
  try {
    proof =
      editId === undefined
        ? await loadNewMonitorEvidence(payload.monitor.name ?? '', payload.monitor.app ?? '', signal, preWriteIds)
        : await loadMonitorDetail(editId, signal);
  } catch (error) {
    return classifyMonitorReadError(error) === 'unavailable'
      ? unavailableMonitorWrite()
      : invalidMonitorWriteEvidence<MonitorDetail>();
  }
  return monitorWritableConverged(input.mode, payload, proof, input.defines, input.before)
    ? verifiedMonitorWrite(proof)
    : invalidMonitorWriteEvidence(proof);
}

function shouldReconcileUncertainMonitorCreate(mode: 'new' | 'edit', error: unknown) {
  return mode === 'new' && error instanceof ApiMessageError && apiMessageWriteOutcome(error) === 'uncertain';
}

async function reconcileUncertainMonitorCreate(
  input: MonitorEditorCommandInput,
  payload: ReturnType<typeof buildMonitorPayload>,
  error: unknown,
  signal: AbortSignal,
  ownsOperation: () => boolean,
  preWriteIds: ReadonlySet<number> | undefined
) {
  if (!preWriteIds || !shouldReconcileUncertainMonitorCreate(input.mode, error)) throw error;
  if (!ownsOperation() || signal.aborted) return undefined;
  const verification = await readMonitorWriteVerification(input, payload, undefined, signal, preWriteIds);
  if (verification.kind !== 'verified') throw error;
  markAcknowledgedMonitorSave(input);
  return verification;
}

async function captureNewMonitorIdentitySnapshot(name: string, app: string, signal: AbortSignal) {
  try {
    return await loadNewMonitorIdentitySnapshot(name, app, signal);
  } catch {
    return undefined;
  }
}
