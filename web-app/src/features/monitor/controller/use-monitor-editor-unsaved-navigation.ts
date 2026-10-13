/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
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
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useBeforeUnload, useBlocker } from 'react-router-dom';

import type { MonitorEditorDraft } from '../model/monitor-editor-model';

export function useMonitorEditorUnsavedNavigation(
  dirty: boolean,
  source: string,
  draft: MonitorEditorDraft | undefined
) {
  const { modal } = App.useApp();
  const { t } = useTranslation();
  const saved = useRef(false);
  useLayoutEffect(() => {
    saved.current = false;
  }, [source, draft]);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    return dirty && !saved.current && currentLocation.pathname !== nextLocation.pathname;
  });
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (dirty && !saved.current) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [dirty]
    )
  );
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    // An acknowledged save or explicit Cancel already owns its navigation.
    if (saved.current) return;
    if (!dirty) {
      blocker.proceed();
      return;
    }
    let active = true;
    const resolve = (action: () => void) => {
      if (!active) return;
      active = false;
      action();
    };
    const confirmation = modal.confirm({
      title: t('common.unsavedChangesConfirm'),
      okText: t('common.discardChanges'),
      cancelText: t('common.cancel'),
      onOk: () => resolve(blocker.proceed),
      onCancel: () => resolve(blocker.reset)
    });
    return () => {
      active = false;
      confirmation.destroy();
    };
  }, [blocker, dirty, modal, t]);
  return {
    allow: () => {
      // Explicit Cancel and an acknowledged save own their departure.
      saved.current = true;
    }
  };
}
