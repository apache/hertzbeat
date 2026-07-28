/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
