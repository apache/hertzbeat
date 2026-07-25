/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { loadAlertGroups } from '../api/alert-api';
import { AlertContractError, alertPageSizes, type AlertQuery } from '../model/alert-model';

const proofPageSize = Math.max(...alertPageSizes);
const maximumProofPages = 10_000;

export class AlertDeleteProofError extends AlertContractError {
  constructor(readonly kind: 'present' | 'invalid') {
    super('Alert delete proof did not converge');
    this.name = 'AlertDeleteProofError';
  }
}

export async function proveAlertGroupMissing(id: number) {
  for (let pageIndex = 0; pageIndex < maximumProofPages; pageIndex += 1) {
    const page = await loadAlertGroups(proofQuery(pageIndex));
    if (page.content.some(group => group.id === id)) {
      throw new AlertDeleteProofError('present');
    }
    if (page.totalPages > maximumProofPages) {
      throw new AlertDeleteProofError('invalid');
    }
    if (pageIndex + 1 >= page.totalPages) return;
  }
  throw new AlertDeleteProofError('invalid');
}

function proofQuery(pageIndex: number): AlertQuery {
  // Proof is deliberately global so a concurrent status or label change cannot
  // make an existing group disappear merely by moving it outside the visible filter.
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
