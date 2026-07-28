/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { statusWriteOutcome } from '@/features/status/shared/status-error-model';

import { isStatusManagementMissing } from '../api/status-management-api';

import {
  StatusManagementContractError,
  type StatusComponent,
  type StatusIncident,
  type StatusOrg
} from '../model/status-management-contract';

export function requireStatusId(id: number | undefined) {
  if (!Number.isSafeInteger(id) || (id ?? 0) < 1) throw new StatusManagementContractError();
  if (id === undefined) throw new StatusManagementContractError();
  return id;
}

/** A transport/server/malformed-success failure cannot prove that a write was rejected. */
export function isAmbiguousStatusWriteFailure(error: unknown) {
  return statusWriteOutcome(error) === 'uncertain';
}

function statusComponentIdentityMatches(actual: StatusComponent, expected: StatusComponent) {
  return JSON.stringify(componentWritable(actual, false)) === JSON.stringify(componentWritable(expected, false));
}

function statusIncidentIdentityMatches(actual: StatusIncident, expected: StatusIncident) {
  return JSON.stringify(incidentWritable(actual)) === JSON.stringify(incidentWritable(expected));
}

export function requireStatusComponentWritable(actual: StatusComponent, expected: StatusComponent) {
  const expectedId = requireStatusId(expected.id);
  requireStatusExactId(requireStatusId(actual.id), expectedId);
  if (!statusComponentIdentityMatches(actual, expected)) throw new StatusManagementContractError();
}

export function requireStatusIncidentWritable(actual: StatusIncident, expected: StatusIncident) {
  const expectedId = requireStatusId(expected.id);
  requireStatusExactId(requireStatusId(actual.id), expectedId);
  if (!statusIncidentIdentityMatches(actual, expected)) throw new StatusManagementContractError();
}

export function requireStatusOrgWritable(actual: StatusOrg, expected: StatusOrg) {
  requireStatusExactId(requireStatusId(actual.id), requireStatusId(expected.id));
  requireStatusOrgFields(actual, expected);
}

export function requireCreatedStatusOrgWritable(actual: StatusOrg, expected: StatusOrg) {
  requireStatusId(actual.id);
  requireStatusOrgFields(actual, expected);
}

function requireStatusOrgFields(actual: StatusOrg, expected: StatusOrg) {
  if (JSON.stringify(orgWritable(actual)) !== JSON.stringify(orgWritable(expected)))
    throw new StatusManagementContractError();
}

function orgWritable(value: StatusOrg) {
  return {
    name: value.name,
    description: value.description,
    home: value.home,
    logo: value.logo,
    feedback: value.feedback ?? null,
    color: value.color ?? null,
    state: value.state
  };
}

function componentWritable(value: StatusComponent, includeId: boolean) {
  return {
    ...(includeId ? { id: value.id ?? null } : {}),
    orgId: value.orgId,
    name: value.name,
    description: value.description ?? null,
    labels: Object.entries(value.labels ?? {}).sort(([left], [right]) => left.localeCompare(right)),
    method: value.method,
    configState: value.configState
    // state and audit fields are server-derived; StatusPageServiceImpl rewrites state for manual components.
  };
}

function incidentWritable(value: StatusIncident) {
  return {
    orgId: value.orgId,
    name: value.name,
    state: value.state,
    components: (value.components ?? [])
      .map(item => componentWritable(item, true))
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
    // History order is presentation-only: the editor appends oldest-first while the backend reads newest-first.
    contents: (value.contents ?? [])
      .map(item => ({
        message: item.message,
        state: item.state,
        timestamp: item.timestamp
      }))
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
    // ids, start/end time, incidentId and audit fields are assigned by the backend.
  };
}

export function requireStatusExactId(actual: number, expected: number) {
  if (actual !== expected) throw new StatusManagementContractError();
}

export async function proveStatusMissing(load: () => Promise<unknown>) {
  try {
    await load();
  } catch (error) {
    if (isStatusManagementMissing(error)) return;
    throw error;
  }
  throw new StatusManagementContractError();
}
