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
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

import { loadAlertSilence } from '../api/alert-silence-api';
import type { AlertSilenceDetailState } from '../model/alert-silence-page-model';
import {
  AlertSilenceContractError,
  alertSilenceFailureKind,
  alertSilenceDraftFromDetail,
  createAlertSilenceDraft,
  type AlertSilenceDraft
} from '../model/alert-silence-model';

export function useAlertSilenceDetailController(isBusy: () => boolean, isWriteLocked: () => boolean) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [detail, setDetail] = useState<AlertSilenceDetailState>({ kind: 'idle' });
  const intent = useRef(0);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => retireDetail(intent, request), []);
  const close = useCallback(() => {
    retireDetail(intent, request);
    setDetail({ kind: 'idle' });
  }, []);
  const captureCloseCurrentSession = useCallback(() => {
    const session = intent.current;
    return () => {
      if (intent.current === session) close();
    };
  }, [close]);
  const edit = useCallback(
    async (id: number) => {
      // A retained write receipt belongs to the current editor session. Do not
      // let another detail inherit that session's recovery controls.
      if (isWriteLocked()) return;
      request.current?.abort();
      const active = new AbortController();
      request.current = active;
      const token = ++intent.current;
      setDetail({ kind: 'loading', id });
      try {
        const record = await loadAlertSilence(id, active.signal);
        if (record.id !== id) throw new AlertSilenceContractError('detail id does not match the command');
        if (intent.current === token) {
          setDetail({ kind: 'ready', source: 'detail', id, draft: alertSilenceDraftFromDetail(record) });
        }
      } catch (reason) {
        if (!active.signal.aborted && intent.current === token) {
          setDetail({ kind: alertSilenceFailureKind(reason), id });
          void message.error(t('alertSilences.loadFailed'));
        }
      } finally {
        if (request.current === active) request.current = null;
      }
    },
    [isWriteLocked, message, t]
  );
  const actions = useAlertSilenceDraftActions(isBusy, isWriteLocked, intent, request, setDetail, close);
  return { detail, captureCloseCurrentSession, edit, ...actions };
}

function useAlertSilenceDraftActions(
  isBusy: () => boolean,
  isWriteLocked: () => boolean,
  intent: RefObject<number>,
  request: RefObject<AbortController | null>,
  setDetail: Dispatch<SetStateAction<AlertSilenceDetailState>>,
  close: () => void
) {
  const create = () => {
    if (isWriteLocked()) return;
    retireDetail(intent, request);
    setDetail({ kind: 'ready', source: 'create', draft: createAlertSilenceDraft() });
  };
  const cancel = () => {
    if (!isBusy()) close();
  };
  const updateDraft = (patch: Partial<AlertSilenceDraft>) => {
    if (!isWriteLocked()) {
      setDetail(current => replaceReadyDraft(current, currentDraft => ({ ...currentDraft, ...patch })));
    }
  };
  const replaceDraft = (draft: AlertSilenceDraft) => {
    if (!isWriteLocked()) setDetail(current => replaceReadyDraft(current, () => draft));
  };
  return { create, cancel, updateDraft, replaceDraft };
}

function replaceReadyDraft(
  current: AlertSilenceDetailState,
  replace: (draft: AlertSilenceDraft) => AlertSilenceDraft
): AlertSilenceDetailState {
  return current.kind === 'ready' ? { ...current, draft: replace(current.draft) } : current;
}

function retireDetail(intent: RefObject<number>, request: RefObject<AbortController | null>) {
  intent.current += 1;
  request.current?.abort();
  request.current = null;
}
