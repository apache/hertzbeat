/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { loadAlertInhibit } from './alert-inhibit-api';
import {
  AlertInhibitContractError,
  alertInhibitFailureKind,
  type AlertInhibit,
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
