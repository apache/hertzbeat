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

import { App } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  deleteAlertSilence,
  deleteAlertSilences,
  loadAlertSilence,
  saveAlertSilence,
  updateAlertSilenceEnabled
} from '../api/alert-silence-api';
import {
  AlertSilenceContractError,
  alertSilenceFailureKind,
  buildAlertSilencePayload,
  normalizeAlertSilenceIds,
  validateAlertSilenceDraft,
  type AlertSilence,
  type AlertSilenceDraft,
  type AlertSilencePage
} from '../model/alert-silence-model';
import { useAlertSilenceOperationGate } from './use-alert-silence-operation-gate';

const operationFeedback = {
  success: 'alertSilences.operationSuccess',
  error: 'alertSilences.operationFailed'
} as const;
const saveFeedback = { success: 'alertSilences.saveSuccess', error: 'alertSilences.saveFailed' } as const;

export function useAlertSilenceMutations(
  rereadList: () => Promise<AlertSilencePage>,
  readCreatedProjection: (draft: AlertSilenceDraft) => Promise<AlertSilencePage>
) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const gate = useAlertSilenceOperationGate();
  const save = async (draft: AlertSilenceDraft | null, onCommitted: () => void) => {
    if (gate.isLocked()) return;
    if (!draft || validateAlertSilenceDraft(draft).length > 0) {
      void message.warning(t('alertSilences.validation'));
      return;
    }
    const current = draft;
    await gate.run(buildSaveOperation(current, onCommitted, rereadList, readCreatedProjection), saveFeedback);
  };
  const toggle = (silence: AlertSilence, enabled: boolean) =>
    gate.run(
      {
        kind: 'toggle',
        write: () => updateAlertSilenceEnabled(silence, enabled),
        prove: async () =>
          requireSilenceConvergence(await loadAlertSilence(silence.id), { ...silence, enable: enabled }),
        project: async () => {
          await rereadList();
        }
      },
      operationFeedback
    );
  const removeMany = (ids: readonly number[]) => {
    const commandIds = normalizeAlertSilenceIds(ids);
    return gate.run(
      {
        kind: 'delete',
        write: () => (commandIds.length === 1 ? deleteAlertSilence(commandIds[0]!) : deleteAlertSilences(commandIds)),
        prove: () => requireMissingSilences(commandIds),
        project: async () => {
          requireAlertSilencesAbsent(await rereadList(), commandIds);
        }
      },
      operationFeedback
    );
  };
  const remove = (id: number) => removeMany([id]);
  return { ...gate, save, toggle, remove, removeMany };
}

function buildSaveOperation(
  draft: AlertSilenceDraft,
  onCommitted: () => void,
  rereadList: () => Promise<AlertSilencePage>,
  readCreatedProjection: (draft: AlertSilenceDraft) => Promise<AlertSilencePage>
) {
  const id = draft.id;
  const creating = id === undefined;
  return {
    kind: creating ? ('create' as const) : ('update' as const),
    write: () => saveAlertSilence(draft),
    onCommitted,
    ...(id === undefined ? {} : { prove: async () => requireDraftConvergence(await loadAlertSilence(id), draft) }),
    project: async () => {
      if (creating) requireCreatedProjection(await readCreatedProjection(draft), draft);
      await rereadList();
    },
    ...(creating
      ? {
          recoverProjection: async () => {
            await rereadList();
          }
        }
      : {})
  };
}

async function requireMissingSilence(id: number) {
  try {
    await loadAlertSilence(id);
  } catch (reason) {
    if (alertSilenceFailureKind(reason) === 'missing') return;
    throw reason;
  }
  throw new AlertSilenceContractError('Deleted silence still exists');
}

async function requireMissingSilences(ids: readonly number[]) {
  await Promise.all(ids.map(requireMissingSilence));
}

function requireAlertSilencesAbsent(page: AlertSilencePage, ids: readonly number[]) {
  const deletedIds = new Set(ids);
  if (page.content.some(record => deletedIds.has(record.id))) {
    throw new AlertSilenceContractError('Deleted Alert Silence remains in the visible projection');
  }
}

function requireCreatedProjection(page: AlertSilencePage, draft: AlertSilenceDraft) {
  const payload = buildAlertSilencePayload(draft);
  // An identical pre-existing row may satisfy this visibility check because
  // the POST contract does not return the new id. The HTTP success remains the
  // commit authority, so a miss must never make the write retryable.
  const converged = page.content.some(actual => silenceMatches(actual, { ...actual, ...payload, id: actual.id }));
  if (!converged) throw new AlertSilenceContractError('Created Alert Silence is absent from the list projection');
}

function requireDraftConvergence(actual: AlertSilence, draft: AlertSilenceDraft) {
  if (draft.id === undefined) throw new AlertSilenceContractError('edit convergence requires id');
  const payload = buildAlertSilencePayload(draft);
  requireSilenceConvergence(actual, { ...actual, ...payload, id: draft.id });
}

function requireSilenceConvergence(actual: AlertSilence, expected: AlertSilence) {
  if (!silenceMatches(actual, expected)) {
    throw new AlertSilenceContractError('Alert Silence canonical fields did not converge');
  }
}

function silenceMatches(actual: AlertSilence, expected: AlertSilence) {
  return !(
    actual.id !== expected.id ||
    actual.name !== expected.name ||
    actual.enable !== expected.enable ||
    actual.matchAll !== expected.matchAll ||
    actual.type !== expected.type ||
    !mapsEqual(actual.labels, expected.labels) ||
    !arraysEqual(actual.days, expected.days) ||
    !timesEqual(actual.periodStart, expected.periodStart) ||
    !timesEqual(actual.periodEnd, expected.periodEnd)
  );
}

function mapsEqual(left: Record<string, string> | null, right: Record<string, string> | null) {
  if (left === null || right === null) return left === right;
  const keys = Object.keys(left).sort();
  return keys.length === Object.keys(right).length && keys.every(key => left[key] === right[key]);
}

function arraysEqual(left: number[] | null, right: number[] | null) {
  if (left === null || right === null) return left === right;
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function timesEqual(left: string | null, right: string | null) {
  if (left === null || right === null) return left === right;
  return Date.parse(left) === Date.parse(right);
}
