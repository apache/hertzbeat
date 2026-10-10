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

import { useCallback, useState } from 'react';

import { persistSystemPreferences } from '@/core/runtime-preferences';

import {
  isSystemConfigDirty,
  systemThemeToRuntimeTheme,
  validateSystemConfigDraft,
  type SystemConfigDraft,
  type SystemConfigResourceRecord
} from '../model/system-config-model';
import {
  useSystemConfigSaveTransaction,
  type SystemConfigCanonicalRead,
  type SystemConfigMutation,
  type SystemConfigSaveNotifications
} from './system-config-save-transaction';

type FormOptions = {
  baseline: SystemConfigDraft;
  mutation: SystemConfigMutation;
  notifications: SystemConfigSaveNotifications;
  reread: SystemConfigCanonicalRead;
  retryRead: () => unknown;
  retryTimezones: () => unknown;
  timezoneOptions: Array<{ value: string; label: string }>;
  timezonesFailed: boolean;
  timezonesPending: boolean;
  canConfigure: boolean;
};

export function useSystemConfigFormController(options: FormOptions) {
  const [draft, setDraft] = useState<SystemConfigDraft | null>(null);
  const retireDraft = useCallback(() => setDraft(null), []);
  const current = draft ?? options.baseline;
  const dirty = draft !== null && isSystemConfigDirty(draft, options.baseline);
  const valid = validateSystemConfigDraft(current).length === 0;
  const transaction = useSystemConfigSaveTransaction(
    {
      accept: record => {
        setDraft(null);
        applyCanonicalSystemConfig(record);
      },
      mutation: options.mutation,
      reread: options.reread,
      retireDraft,
      ...options.notifications
    },
    options.canConfigure
  );
  const update = <K extends keyof SystemConfigDraft>(field: K, value: SystemConfigDraft[K]) => {
    if (!transaction.canWrite() || transaction.isLocked()) return;
    setDraft(previous => ({ ...(previous ?? current), [field]: value }));
  };
  const discard = () => {
    if (transaction.canWrite() && !transaction.isLocked()) setDraft(null);
  };
  const retryRead = async () => {
    if (!transaction.isLocked()) await options.retryRead();
  };
  const retrySave = () => transaction.retry();
  const retryTimezones = () => {
    if (!transaction.isLocked()) void options.retryTimezones();
  };
  const save = () => {
    if (transaction.canWrite() && dirty && valid) transaction.submit(current);
  };
  return {
    discard,
    retryRead,
    retrySave,
    retryTimezones,
    save,
    state: projectSystemConfigFormState(options, transaction, current, dirty, valid),
    update,
    useCurrentServerSettings: transaction.useCurrentServerSettings
  };
}

function projectSystemConfigFormState(
  options: FormOptions,
  transaction: ReturnType<typeof useSystemConfigSaveTransaction>,
  current: SystemConfigDraft,
  dirty: boolean,
  valid: boolean
) {
  return {
    current,
    accepting: transaction.accepting,
    canConfigure: options.canConfigure,
    canUseCurrentServerSettings: transaction.canUseCurrentServerSettings,
    dirty,
    locked: transaction.isLocked(),
    proving: transaction.proving,
    recovery: transaction.recovery,
    saving: transaction.saving,
    timezoneOptions: options.timezoneOptions,
    timezonesFailed: options.timezonesFailed,
    timezonesPending: options.timezonesPending,
    valid
  };
}

/** Apply only the canonical backend response before reloading runtime locale and theme. */
function applyCanonicalSystemConfig(record: SystemConfigResourceRecord) {
  try {
    persistSystemPreferences({ locale: record.locale, theme: systemThemeToRuntimeTheme(record.theme) });
  } finally {
    globalThis.location.reload();
  }
}
