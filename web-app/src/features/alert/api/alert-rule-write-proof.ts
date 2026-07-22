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

import { loadAlertRule, loadAlertRules } from './alert-rule-api';
import {
  AlertRuleContractError,
  buildAlertRulePayload,
  type AlertRule,
  type AlertRuleDraft,
  type AlertRulePage
} from '../model/alert-rule-model';

export const maximumAlertRuleCreateProofPages = 10;

export class AlertRuleCreateProofLimitError extends AlertRuleContractError {
  constructor() {
    super(`create proof exceeds the ${maximumAlertRuleCreateProofPages}-page compatibility limit`);
    this.name = 'AlertRuleCreateProofLimitError';
  }
}

export class AlertRuleCreateIdentityUncertainError extends AlertRuleContractError {
  constructor() {
    super('create proof cannot identify exactly one new rule');
    this.name = 'AlertRuleCreateIdentityUncertainError';
  }
}

type AlertRulePayload = ReturnType<typeof buildAlertRulePayload>;

export async function proveUpdatedAlertRule(draft: AlertRuleDraft, expected: AlertRulePayload) {
  if (draft.id === undefined) throw new AlertRuleContractError('update proof requires id');
  const canonical = await loadAlertRule(draft.id);
  requireConvergence(canonical, expected, draft.id);
}

export async function captureAlertRuleCreateBaseline(name: string) {
  const matches = await loadExactNameRules(name);
  const ids = matches.map(rule => rule.id);
  if (new Set(ids).size !== ids.length) throw new AlertRuleContractError('create baseline contains duplicate ids');
  return ids;
}

export async function proveCreatedAlertRule(expected: AlertRulePayload, baselineIds: number[]) {
  const baseline = new Set(baselineIds);
  if (baseline.size !== baselineIds.length) throw new AlertRuleContractError('create baseline contains duplicate ids');
  const matches = await loadExactNameRules(expected.name);
  const candidates = matches.filter(rule => !baseline.has(rule.id));
  if (candidates.length !== 1) throw new AlertRuleCreateIdentityUncertainError();
  requireConvergence(candidates[0] as AlertRule, expected);
}

async function loadExactNameRules(name: string) {
  const first = await loadAlertRules({ search: name, pageIndex: 0, pageSize: 25 });
  assertBoundedPageCount(first.totalPages);
  const pages: AlertRulePage[] = [first];

  // The POST endpoint does not return the new id. This bounded scan is a
  // temporary compatibility proof, not permission to traverse arbitrary pages.
  for (let pageIndex = 1; pageIndex < first.totalPages; pageIndex += 1) {
    const page = await loadAlertRules({ search: name, pageIndex, pageSize: 25 });
    assertStablePageSet(page, first);
    pages.push(page);
  }

  return pages.flatMap(page => page.content).filter(rule => rule.name === name);
}

function assertBoundedPageCount(totalPages: number) {
  if (!Number.isSafeInteger(totalPages) || totalPages < 0 || totalPages > maximumAlertRuleCreateProofPages) {
    throw new AlertRuleCreateProofLimitError();
  }
}

function assertStablePageSet(page: AlertRulePage, first: AlertRulePage) {
  assertBoundedPageCount(page.totalPages);
  if (page.totalElements !== first.totalElements || page.totalPages !== first.totalPages) {
    throw new AlertRuleContractError('create proof page changed while traversing');
  }
}

function requireConvergence(actual: AlertRule, expected: AlertRulePayload, expectedId?: number) {
  if (expectedId !== undefined && actual.id !== expectedId) {
    throw new AlertRuleContractError('canonical id drifted');
  }
  const scalarFieldsMatch = [
    actual.name === expected.name,
    actual.type === expected.type,
    actual.datasource === expected.datasource,
    actual.expr === expected.expr,
    actual.period === expected.period,
    actual.times === expected.times,
    actual.template === expected.template,
    actual.enable === expected.enable
  ].every(Boolean);
  if (
    !scalarFieldsMatch ||
    !mapsEqual(actual.labels, expected.labels) ||
    !mapsEqual(actual.annotations, expected.annotations)
  ) {
    throw new AlertRuleContractError('canonical writable fields did not converge');
  }
}

function mapsEqual(actual: Record<string, string> | null, expected: Record<string, string> | null) {
  if (actual === null || expected === null) return actual === expected;
  const left = Object.keys(actual).sort();
  const right = Object.keys(expected).sort();
  return (
    left.length === right.length && left.every((key, index) => key === right[index] && actual[key] === expected[key])
  );
}
