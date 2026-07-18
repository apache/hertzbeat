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
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  classifyAlertSilenceReadError,
  deleteAlertSilence,
  loadAlertSilence,
  saveAlertSilence,
  updateAlertSilenceEnabled
} from '../alert-silence-api';
import {
  AlertSilenceContractError,
  buildAlertSilencePayload,
  validateAlertSilenceDraft,
  type AlertSilence,
  type AlertSilenceDraft,
  type AlertSilencePage
} from '../alert-silence-model';

export function useAlertSilenceMutations(draft: AlertSilenceDraft | null,
  rereadList: () => Promise<AlertSilencePage>, onSaved: () => void) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const operate = async (operation: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      await operation();
      void message.success(t('alertSilences.operationSuccess'));
    } catch {
      void message.error(t('alertSilences.operationFailed'));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const save = async () => {
    if (locked.current) return;
    const current = draft;
    if (!current || validateAlertSilenceDraft(current).length > 0) {
      void message.warning(t('alertSilences.validation'));
      return;
    }
    locked.current = true;
    setBusy(true);
    try {
      await saveAlertSilence(current);
      if (current.id !== undefined) requireDraftConvergence(await loadAlertSilence(current.id), current);
      await rereadList();
      onSaved();
      void message.success(t('alertSilences.saveSuccess'));
    } catch {
      void message.error(t('alertSilences.saveFailed'));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const toggle = (silence: AlertSilence, enabled: boolean) => operate(async () => {
    await updateAlertSilenceEnabled(silence, enabled);
    requireSilenceConvergence(await loadAlertSilence(silence.id), { ...silence, enable: enabled });
    await rereadList();
  });
  const remove = (id: number) => operate(async () => {
    await deleteAlertSilence(id);
    try {
      await loadAlertSilence(id);
    } catch (reason) {
      if (classifyAlertSilenceReadError(reason) === 'missing') {
        await rereadList();
        return;
      }
      throw reason;
    }
    throw new Error('Deleted silence still exists');
  });
  return { busy, isLocked: () => locked.current, save, toggle, remove };
}

function requireDraftConvergence(actual: AlertSilence, draft: AlertSilenceDraft) {
  if (draft.id === undefined) throw new AlertSilenceContractError('edit convergence requires id');
  const payload = buildAlertSilencePayload(draft);
  requireSilenceConvergence(actual, { ...actual, ...payload, id: draft.id });
}

function requireSilenceConvergence(actual: AlertSilence, expected: AlertSilence) {
  if (actual.id !== expected.id || actual.name !== expected.name || actual.enable !== expected.enable
    || actual.matchAll !== expected.matchAll || actual.type !== expected.type
    || !mapsEqual(actual.labels, expected.labels) || !arraysEqual(actual.days, expected.days)
    || !timesEqual(actual.periodStart, expected.periodStart) || !timesEqual(actual.periodEnd, expected.periodEnd)) {
    throw new AlertSilenceContractError('Alert Silence canonical fields did not converge');
  }
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
