/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useState } from 'react';

import { persistSystemPreferences } from '@/core/runtime-preferences';

import {
  isSystemConfigDirty,
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
  retryTimezones: () => unknown;
  timezoneOptions: Array<{ value: string; label: string }>;
  timezonesFailed: boolean;
  timezonesPending: boolean;
};

export function useSystemConfigFormController(options: FormOptions) {
  const [draft, setDraft] = useState<SystemConfigDraft | null>(null);
  const current = draft ?? options.baseline;
  const dirty = draft !== null && isSystemConfigDirty(draft, options.baseline);
  const valid = validateSystemConfigDraft(current).length === 0;
  const transaction = useSystemConfigSaveTransaction({
    accept: record => {
      setDraft(null);
      applyCanonicalSystemConfig(record);
    },
    mutation: options.mutation,
    reread: options.reread,
    ...options.notifications
  });
  const update = <K extends keyof SystemConfigDraft>(field: K, value: SystemConfigDraft[K]) => {
    if (transaction.isLocked()) return;
    setDraft(previous => ({ ...(previous ?? current), [field]: value }));
  };
  const discard = () => {
    if (!transaction.isLocked()) setDraft(null);
  };
  const retry = async () => {
    if (transaction.recovery) return transaction.retry();
    if (!transaction.isLocked()) await options.reread();
  };
  const retryTimezones = () => {
    if (!transaction.isLocked()) void options.retryTimezones();
  };
  const save = () => {
    if (dirty && valid) transaction.submit(current);
  };
  return {
    discard,
    retry,
    retryTimezones,
    save,
    state: {
      current,
      dirty,
      locked: transaction.isLocked(),
      proving: transaction.proving,
      recovery: transaction.recovery,
      saving: transaction.saving,
      timezoneOptions: options.timezoneOptions,
      timezonesFailed: options.timezonesFailed,
      timezonesPending: options.timezonesPending,
      valid
    },
    update
  };
}

/** Apply only the canonical backend response before reloading runtime locale and theme. */
function applyCanonicalSystemConfig(record: SystemConfigResourceRecord) {
  try {
    persistSystemPreferences(record);
  } finally {
    globalThis.location.reload();
  }
}
