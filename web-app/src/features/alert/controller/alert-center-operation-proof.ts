/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { loadAlertGroups } from '../api/alert-api';
import {
  AlertContractError,
  alertPageSizes,
  normalizeAlertGroupIds,
  type AlertGroupTargetStatus,
  type AlertQuery
} from '../model/alert-model';

const proofPageSize = Math.max(...alertPageSizes);
const maximumProofPages = 10_000;

export class AlertCenterProofError extends AlertContractError {
  constructor(readonly kind: 'present' | 'missing' | 'mismatch' | 'invalid') {
    super('Alert center operation proof did not converge');
    this.name = 'AlertCenterProofError';
  }
}

export function proveAlertGroupsMissing(ids: readonly number[]) {
  return scanAlertGroups(normalizeAlertGroupIds(ids), records => {
    if (records.size > 0) throw new AlertCenterProofError('present');
  });
}

export function proveAlertGroupsStatus(ids: readonly number[], status: AlertGroupTargetStatus) {
  const canonicalIds = normalizeAlertGroupIds(ids);
  return scanAlertGroups(canonicalIds, records => {
    if (records.size !== canonicalIds.length) throw new AlertCenterProofError('missing');
    if ([...records.values()].some(current => current !== status)) {
      throw new AlertCenterProofError('mismatch');
    }
  });
}

async function scanAlertGroups(ids: number[], requireEvidence: (records: Map<number, string>) => void) {
  const requested = new Set(ids);
  const records = new Map<number, string>();
  for (let pageIndex = 0; pageIndex < maximumProofPages; pageIndex += 1) {
    const page = await loadAlertGroups(proofQuery(pageIndex));
    page.content.forEach(group => {
      if (requested.has(group.id)) records.set(group.id, group.status);
    });
    if (page.totalPages > maximumProofPages) throw new AlertCenterProofError('invalid');
    if (pageIndex + 1 >= page.totalPages) {
      requireEvidence(records);
      return;
    }
  }
  throw new AlertCenterProofError('invalid');
}

function proofQuery(pageIndex: number): AlertQuery {
  // Proof is global so a status transition cannot look successful merely by
  // moving a record outside the operator's current filter.
  return {
    search: '',
    status: '',
    severity: '',
    serviceName: '',
    serviceNamespace: '',
    environment: '',
    pageIndex,
    pageSize: proofPageSize
  };
}
