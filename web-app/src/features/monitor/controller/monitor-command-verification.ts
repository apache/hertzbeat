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

import { classifyMonitorDetailReadError, loadMonitorDetail } from '../api/monitor-api';
import { monitorStatusCodes, type MonitorAction, type MonitorDetail } from '../model/monitor-contract';
import {
  acknowledgedMonitorWrite,
  invalidMonitorWriteEvidence,
  unavailableMonitorWrite,
  verifiedMonitorWrite,
  type MonitorWriteVerification
} from '../model/monitor-write-verification';

export type MonitorDetailCacheEvidence = { kind: 'detail'; detail: MonitorDetail } | { kind: 'missing'; id: number };

export async function verifyMonitorMutation(
  action: MonitorAction,
  ids: number[],
  signal: AbortSignal
): Promise<MonitorWriteVerification<MonitorDetailCacheEvidence[]>> {
  if (action === 'copy') {
    // Copy returns a transactional acknowledgement without the new id, so an exact-id reread is impossible.
    return acknowledgedMonitorWrite();
  }
  const proofs = await Promise.all(ids.map(id => proveMonitorDetail(action, id, signal)));
  const evidence = proofs.flatMap(proof => ('evidence' in proof && proof.evidence ? [proof.evidence] : []));
  if (proofs.some(proof => proof.kind === 'error')) return invalidMonitorWriteEvidence(evidence);
  if (proofs.some(proof => proof.kind === 'unavailable')) return unavailableMonitorWrite(evidence);
  return verifiedMonitorWrite(evidence);
}

async function proveMonitorDetail(
  action: Exclude<MonitorAction, 'copy'>,
  id: number,
  signal: AbortSignal
): Promise<Exclude<MonitorWriteVerification<MonitorDetailCacheEvidence>, { kind: 'acknowledged' }>> {
  try {
    const detail = await loadMonitorDetail(id, signal);
    if (action === 'delete') return invalidMonitorWriteEvidence({ kind: 'detail', detail });
    const expectedStatus = action === 'enable' ? monitorStatusCodes.available : monitorStatusCodes.paused;
    return detail.monitor.status === expectedStatus
      ? verifiedMonitorWrite({ kind: 'detail', detail })
      : invalidMonitorWriteEvidence({ kind: 'detail', detail });
  } catch (error) {
    const kind = classifyMonitorDetailReadError(error);
    if (action === 'delete' && kind === 'missing') return verifiedMonitorWrite({ kind: 'missing', id });
    return kind === 'unavailable' ? unavailableMonitorWrite() : invalidMonitorWriteEvidence();
  }
}
