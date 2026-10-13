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
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationType, useBlocker } from 'react-router-dom';

/** Query-only history keeps the modal mounted; only a history departure can lose its draft. */
export function useNoticeReceiverUnsavedHistory(dirty: boolean) {
  const { modal } = App.useApp();
  const { t } = useTranslation();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation, historyAction }) =>
      dirty && historyAction === NavigationType.Pop && currentLocation.pathname !== nextLocation.pathname
  );
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
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
}
