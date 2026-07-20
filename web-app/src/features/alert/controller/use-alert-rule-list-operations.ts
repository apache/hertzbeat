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

import { useRef, useState } from 'react';

import { ApiMessageError } from '@/core/http/api-message';
import { useExclusiveOperation } from '@/shared/exclusive-operation';

import { classifyAlertRuleReadError, deleteAlertRules, loadAlertRule, updateAlertRuleEnabled } from '../alert-rule-api';
import {
  AlertRuleContractError,
  buildAlertRuleTogglePayload,
  type AlertRule,
  type AlertRulePage
} from '../alert-rule-model';

type OperationPhase = 'write' | 'proof' | 'projection';
type OperationCommand = 'operating' | 'recovering' | 'idle';

type ToggleReceipt = {
  kind: 'toggle';
  key: string;
  phase: OperationPhase;
  rule: AlertRule;
  enabled: boolean;
  expected: ReturnType<typeof buildAlertRuleTogglePayload>;
};

type DeleteReceipt = {
  kind: 'delete';
  key: string;
  phase: OperationPhase;
  id: number;
};

type OperationReceipt = ToggleReceipt | DeleteReceipt;

type OperationMessages = {
  success: () => void;
  failure: () => void;
};

/**
 * Owns exactly-once list writes and keeps write, canonical proof, and list
 * projection as separate retry phases. A successful or ambiguous write is
 * never repeated merely because a later read is unavailable.
 */
export function useAlertRuleListOperations(rereadLatest: () => Promise<AlertRulePage>, messages: OperationMessages) {
  const gate = useExclusiveOperation('alert-rule-list-command');
  const receiptRef = useRef<OperationReceipt | undefined>(undefined);
  const [recoveryPending, setRecoveryPending] = useState(false);

  const run = async (candidate: OperationReceipt) => {
    const pending = receiptRef.current;
    if (pending && pending.key !== candidate.key) return;
    const owner = gate.begin();
    if (!owner) return;
    const receipt = pending ?? candidate;
    receiptRef.current = receipt;
    try {
      const completed = await advance(receipt, rereadLatest, () => gate.isCurrent(owner));
      if (!completed || !gate.isCurrent(owner)) return;
      receiptRef.current = undefined;
      setRecoveryPending(false);
      messages.success();
    } catch (reason) {
      if (!gate.isCurrent(owner)) return;
      if (receipt.phase === 'write') {
        if (isDefiniteWriteRejection(reason)) {
          receiptRef.current = undefined;
          setRecoveryPending(false);
        } else {
          receipt.phase = 'proof';
          setRecoveryPending(true);
        }
      } else {
        setRecoveryPending(true);
      }
      messages.failure();
    } finally {
      gate.end(owner);
    }
  };

  return {
    command: resolveOperationCommand(gate.pending, recoveryPending),
    isLocked: () => gate.isLocked() || receiptRef.current !== undefined,
    hasReceipt: () => receiptRef.current !== undefined,
    resume: () => {
      const receipt = receiptRef.current;
      return receipt ? run(receipt) : Promise.resolve();
    },
    toggle: (rule: AlertRule, enabled: boolean) => run(createToggleReceipt(rule, enabled)),
    remove: (id: number) => run({ kind: 'delete', key: `delete:${id}`, phase: 'write', id })
  };
}

export type AlertRuleListOperations = ReturnType<typeof useAlertRuleListOperations>;

function resolveOperationCommand(operating: boolean, recovering: boolean): OperationCommand {
  // An active retry remains operating even while it still owns a recovery receipt.
  if (operating) return 'operating';
  if (recovering) return 'recovering';
  return 'idle';
}

async function advance(
  receipt: OperationReceipt,
  rereadLatest: () => Promise<AlertRulePage>,
  isCurrent: () => boolean
) {
  if (receipt.phase === 'write') {
    await write(receipt);
    if (!isCurrent()) return false;
    receipt.phase = 'proof';
  }
  if (receipt.phase === 'proof') {
    await prove(receipt);
    if (!isCurrent()) return false;
    receipt.phase = 'projection';
  }
  const page = await rereadLatest();
  if (!isCurrent()) return false;
  if (receipt.kind === 'delete' && page.content.some(rule => rule.id === receipt.id)) {
    throw new AlertRuleContractError('deleted id remains');
  }
  return true;
}

function write(receipt: OperationReceipt) {
  if (receipt.kind === 'toggle') return updateAlertRuleEnabled(receipt.rule, receipt.enabled);
  return deleteAlertRules([receipt.id]);
}

async function prove(receipt: OperationReceipt) {
  if (receipt.kind === 'delete') return proveMissing(receipt.id);
  const canonical = await loadAlertRule(receipt.rule.id);
  requireWritableConvergence(canonical, receipt.expected);
}

function createToggleReceipt(rule: AlertRule, enabled: boolean): ToggleReceipt {
  return {
    kind: 'toggle',
    key: `toggle:${rule.id}:${enabled}`,
    phase: 'write',
    rule,
    enabled,
    expected: buildAlertRuleTogglePayload(rule, enabled)
  };
}

function isDefiniteWriteRejection(reason: unknown) {
  if (reason instanceof AlertRuleContractError) return true;
  return (
    reason instanceof ApiMessageError && reason.status !== undefined && reason.status >= 400 && reason.status < 500
  );
}

function requireWritableConvergence(actual: AlertRule, expected: ReturnType<typeof buildAlertRuleTogglePayload>) {
  if (
    actual.id !== expected.id ||
    actual.name !== expected.name ||
    actual.type !== expected.type ||
    actual.datasource !== expected.datasource ||
    actual.expr !== expected.expr ||
    actual.period !== expected.period ||
    actual.times !== expected.times ||
    !mapsEqual(actual.labels, expected.labels) ||
    !mapsEqual(actual.annotations, expected.annotations) ||
    actual.template !== expected.template ||
    actual.enable !== expected.enable
  ) {
    throw new AlertRuleContractError('canonical writable fields did not converge');
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

async function proveMissing(id: number) {
  try {
    await loadAlertRule(id);
  } catch (reason) {
    if (classifyAlertRuleReadError(reason) === 'missing') return;
    throw reason;
  }
  throw new AlertRuleContractError('deleted detail still exists');
}
