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

import { classifyMonitorReadError, loadMonitorDetail, loadNewMonitorEvidence, saveMonitor } from '../api/monitor-api';
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
  await saveMonitor(input.mode, payload, signal);
  // A successful write remains authoritative even if proof is later cancelled or unavailable.
  markAcknowledgedMonitorSave(input);
  if (!ownsOperation() || signal.aborted) return undefined;
  let proof: MonitorDetail;
  try {
    proof =
      input.mode === 'edit'
        ? await loadMonitorDetail(input.id!, signal)
        : await loadNewMonitorEvidence(payload.monitor.name ?? '', payload.monitor.app ?? '', signal);
  } catch (error) {
    return classifyMonitorReadError(error) === 'unavailable'
      ? unavailableMonitorWrite()
      : invalidMonitorWriteEvidence<MonitorDetail>();
  }
  return monitorWritableConverged(input.mode, payload, proof, input.defines, input.before)
    ? verifiedMonitorWrite(proof)
    : invalidMonitorWriteEvidence(proof);
}
