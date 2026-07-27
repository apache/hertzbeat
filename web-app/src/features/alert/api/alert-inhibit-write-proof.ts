/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { loadAlertInhibit, loadAllAlertInhibits } from './alert-inhibit-api';
import {
  AlertInhibitContractError,
  AlertInhibitUnavailableError,
  alertInhibitFailureKind,
  buildAlertInhibitPayload,
  type AlertInhibit,
  type AlertInhibitDraft,
  type AlertInhibitPage
} from '../model/alert-inhibit-model';

type WritableInhibit = {
  id: number;
  name: string;
  sourceLabels: Record<string, string> | null;
  targetLabels: Record<string, string> | null;
  equalLabels: string[] | null;
  enable: boolean;
};

export async function loadExactAlertInhibit(id: number) {
  const record = await loadAlertInhibit(id);
  if (record.id !== id) throw new AlertInhibitContractError('detail id does not match the command');
  return record;
}

export function requireAlertInhibitConvergence(actual: AlertInhibit, expected: WritableInhibit) {
  if (
    actual.id !== expected.id ||
    actual.name !== expected.name ||
    !mapsEqual(actual.sourceLabels, expected.sourceLabels) ||
    !mapsEqual(actual.targetLabels, expected.targetLabels) ||
    !setsEqual(actual.equalLabels, expected.equalLabels) ||
    actual.enable !== expected.enable
  ) {
    throw new AlertInhibitContractError('canonical writable fields did not converge');
  }
}

export async function snapshotAlertInhibitIds() {
  return new Set((await loadAllAlertInhibits()).map(record => record.id));
}

export async function identifyCreatedAlertInhibit(previousIds: Set<number> | undefined, draft: AlertInhibitDraft) {
  if (!previousIds) {
    throw new AlertInhibitUnavailableError('created inhibit is missing its pre-write identity snapshot');
  }
  const created = (await loadAllAlertInhibits()).filter(
    record => !previousIds.has(record.id) && alertInhibitMatchesDraft(record, draft)
  );
  if (created.length !== 1) {
    throw new AlertInhibitUnavailableError('created inhibit does not have one exact new canonical identity');
  }
  return created[0]!.id;
}

function alertInhibitMatchesDraft(actual: AlertInhibit, draft: AlertInhibitDraft) {
  const expected = buildAlertInhibitPayload(draft);
  return (
    actual.name === expected.name &&
    mapsEqual(actual.sourceLabels, expected.sourceLabels) &&
    mapsEqual(actual.targetLabels, expected.targetLabels) &&
    setsEqual(actual.equalLabels, expected.equalLabels) &&
    actual.enable === expected.enable
  );
}

async function proveAlertInhibitMissing(id: number) {
  try {
    await loadAlertInhibit(id);
  } catch (reason) {
    if (alertInhibitFailureKind(reason) === 'missing') return;
    throw reason;
  }
  throw new AlertInhibitContractError('deleted detail still exists');
}

export async function proveAlertInhibitsMissing(ids: number[]) {
  await Promise.all(ids.map(proveAlertInhibitMissing));
}

export function requireAlertInhibitsAbsent(page: AlertInhibitPage, ids: number[]) {
  const deletedIds = new Set(ids);
  if (page.content.some(record => deletedIds.has(record.id))) {
    throw new AlertInhibitContractError('a deleted id remains');
  }
}

function mapsEqual(actual: Record<string, string> | null, expected: Record<string, string> | null) {
  if (actual === null || expected === null) return actual === expected;
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key, index) => key === expectedKeys[index] && actual[key] === expected[key])
  );
}

function setsEqual(actual: string[] | null, expected: string[] | null) {
  const left = [...(actual ?? [])].sort();
  const right = [...(expected ?? [])].sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
