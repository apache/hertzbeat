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
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationType, useBlocker } from 'react-router-dom';

type CloseRequest = { discard: () => void; stay?: () => void };

/** History shares the explicit close confirmation; confirmed close and save retain their PUSH paths. */
export function useAlertRuleUnsavedHistory(dirty: boolean, cancel: () => void) {
  const { modal } = App.useApp();
  const { t } = useTranslation();
  const blocker = useBlocker(({ historyAction }) => dirty && historyAction === NavigationType.Pop);
  const confirmation = useRef<ReturnType<typeof modal.confirm> | null>(null);
  const request = useRef<CloseRequest | null>(null);
  const confirm = useCallback(
    (next: CloseRequest) => {
      request.current = next;
      if (confirmation.current) return;
      let active = true;
      const finish = (discard: boolean) => {
        if (!active || confirmation.current !== handle) return;
        active = false;
        const pending = request.current;
        request.current = null;
        confirmation.current = null;
        if (discard) pending?.discard();
        else pending?.stay?.();
      };
      const handle = modal.confirm({
        title: t('common.unsavedChangesConfirm'),
        okText: t('common.discardChanges'),
        cancelText: t('common.cancel'),
        onOk: () => finish(true),
        onCancel: () => finish(false),
        afterClose: () => {
          if (confirmation.current === handle) {
            confirmation.current = null;
            request.current = null;
          }
        }
      });
      confirmation.current = handle;
    },
    [modal, t]
  );
  const retire = useCallback(() => {
    const handle = confirmation.current;
    confirmation.current = null;
    request.current = null;
    handle?.destroy();
  }, []);
  useEffect(() => retire, [retire]);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (!dirty) {
      retire();
      blocker.proceed();
      return;
    }
    confirm({ discard: blocker.proceed, stay: blocker.reset });
  }, [blocker, confirm, dirty, retire]);
  return () => {
    if (blocker.state === 'blocked') confirm({ discard: blocker.proceed, stay: blocker.reset });
    else if (dirty) confirm({ discard: cancel });
    else cancel();
  };
}
