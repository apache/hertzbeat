/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { classifyAlertGroupReadError, loadAlertGroup, loadAlertGroups } from './alert-group-api';
import { AlertGroupContractError, alertGroupPageSizes, type AlertGroupConverge } from './alert-group-model';

const createProofPageSize = alertGroupPageSizes[alertGroupPageSizes.length - 1] ?? 25;

type WritableAlertGroup = {
  id: number;
  name: string;
  groupLabels: string[] | null;
  groupWait: number | null;
  groupInterval: number | null;
  repeatInterval: number | null;
  enable: boolean;
};

export type AlertGroupCreateProof = {
  expected: Omit<WritableAlertGroup, 'id'>;
  previousHighestId: number;
};

export function requireExactAlertGroupId(actual: number, expected: number) {
  if (actual !== expected) throw new AlertGroupContractError('detail id does not match the command');
}

export function requireAlertGroupConvergence(actual: AlertGroupConverge, expected: WritableAlertGroup) {
  if (actual.id !== expected.id || !writableFieldsMatch(actual, expected)) {
    throw new AlertGroupContractError('canonical writable fields did not converge');
  }
}

export async function prepareAlertGroupCreateProof(
  expected: Omit<WritableAlertGroup, 'id'>
): Promise<AlertGroupCreateProof> {
  const page = await loadAlertGroups(createProofQuery(expected.name));
  return {
    expected,
    previousHighestId: requireDescendingProofHead(page)
  };
}

export async function proveAlertGroupCreated(proof: AlertGroupCreateProof) {
  const page = await loadAlertGroups(createProofQuery(proof.expected.name));
  requireDescendingProofHead(page);
  const candidates = exactNameRecords(page.content, proof.expected.name).filter(
    record => record.id > proof.previousHighestId && writableFieldsMatch(record, proof.expected)
  );
  const [created] = candidates;
  if (!created || candidates.length !== 1) {
    throw new AlertGroupContractError('canonical create evidence is missing or ambiguous');
  }
  return created;
}

export async function proveAlertGroupMissing(id: number) {
  try {
    await loadAlertGroup(id);
  } catch (reason) {
    if (classifyAlertGroupReadError(reason) === 'missing') return;
    throw reason;
  }
  throw new AlertGroupContractError('deleted detail still exists');
}

function stringListsEqual(actual: string[] | null, expected: string[] | null) {
  if (actual === null || expected === null) return actual === expected;
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function createProofQuery(name: string) {
  return {
    search: name,
    pageIndex: 0,
    pageSize: createProofPageSize
  };
}

function requireDescendingProofHead(page: Awaited<ReturnType<typeof loadAlertGroups>>) {
  const expectedLength = Math.min(page.totalElements, createProofPageSize);
  const isDescending = page.content.every((record, index) => {
    const previous = page.content[index - 1];
    return previous === undefined || previous.id > record.id;
  });
  if (
    page.number !== 0 ||
    page.size !== createProofPageSize ||
    page.content.length !== expectedLength ||
    !isDescending
  ) {
    throw new AlertGroupContractError('create proof page is not a complete descending head');
  }
  // POST returns no id. The list request explicitly sorts by id descending, so
  // only an exact-name record above this head can prove a later create. This
  // remains safe when the search projection spans more than one page.
  return page.content[0]?.id ?? 0;
}

function exactNameRecords(records: AlertGroupConverge[], name: string) {
  return records.filter(record => record.name === name);
}

function writableFieldsMatch(actual: AlertGroupConverge, expected: Omit<WritableAlertGroup, 'id'>) {
  return (
    actual.name === expected.name &&
    stringListsEqual(actual.groupLabels, expected.groupLabels) &&
    actual.groupWait === expected.groupWait &&
    actual.groupInterval === expected.groupInterval &&
    actual.repeatInterval === expected.repeatInterval &&
    actual.enable === expected.enable
  );
}
