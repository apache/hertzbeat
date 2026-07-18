/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { classifyAlertGroupReadError, loadAlertGroup } from './alert-group-api';
import {
  AlertGroupContractError,
  type AlertGroupConverge
} from './alert-group-model';

type WritableAlertGroup = {
  id: number;
  name: string;
  groupLabels: string[] | null;
  groupWait: number | null;
  groupInterval: number | null;
  repeatInterval: number | null;
  enable: boolean;
};

export function requireExactAlertGroupId(actual: number, expected: number) {
  if (actual !== expected) throw new AlertGroupContractError('detail id does not match the command');
}

export function requireAlertGroupConvergence(actual: AlertGroupConverge, expected: WritableAlertGroup) {
  const fieldsMatch = actual.id === expected.id
    && actual.name === expected.name
    && stringListsEqual(actual.groupLabels, expected.groupLabels)
    && actual.groupWait === expected.groupWait
    && actual.groupInterval === expected.groupInterval
    && actual.repeatInterval === expected.repeatInterval
    && actual.enable === expected.enable;
  if (!fieldsMatch) throw new AlertGroupContractError('canonical writable fields did not converge');
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
