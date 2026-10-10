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

import { loadAlertGroupEvidence } from '../api/alert-api';
import { AlertContractError, normalizeAlertEvidenceIds, type AlertGroupTargetStatus } from '../model/alert-model';

export class AlertCenterProofError extends AlertContractError {
  constructor(readonly kind: 'present' | 'missing' | 'mismatch') {
    super('Alert center operation proof did not converge');
    this.name = 'AlertCenterProofError';
  }
}

export async function proveAlertGroupsMissing(ids: readonly number[]) {
  const evidence = await loadAlertGroupEvidence(normalizeAlertEvidenceIds(ids));
  if (evidence.groups.length > 0) throw new AlertCenterProofError('present');
}

export async function proveAlertGroupsStatus(ids: readonly number[], status: AlertGroupTargetStatus) {
  const evidence = await loadAlertGroupEvidence(normalizeAlertEvidenceIds(ids));
  if (evidence.missingIds.length > 0) throw new AlertCenterProofError('missing');
  if (evidence.groups.some(group => group.status !== status)) throw new AlertCenterProofError('mismatch');
}
