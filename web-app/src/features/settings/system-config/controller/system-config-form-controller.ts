/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useUpdate, type HttpError } from '@refinedev/core';
import { useCallback, useState } from 'react';

import { persistSystemPreferences } from '@/core/runtime-preferences';
import { useExclusiveOperation, type ExclusiveOperation } from '@/shared/exclusive-operation';

import {
  isSystemConfigDirty,
  systemConfigResourceId,
  validateSystemConfigDraft,
  type SystemConfigDraft,
  type SystemConfigResourceRecord
} from '../model/system-config-model';

type SystemConfigMutation = ReturnType<typeof useUpdate<SystemConfigResourceRecord, HttpError, SystemConfigDraft>>;

type FormOptions = {
  baseline: SystemConfigDraft;
  mutation: SystemConfigMutation;
  refetch: () => unknown;
  retryTimezones: () => unknown;
  timezoneOptions: Array<{ value: string; label: string }>;
  timezonesFailed: boolean;
  timezonesPending: boolean;
};

export function useSystemConfigFormController(options: FormOptions) {
  const [draft, setDraft] = useState<SystemConfigDraft | null>(null);
  const operation = useExclusiveOperation('system-config-save');
  const current = draft ?? options.baseline;
  const dirty = draft !== null && isSystemConfigDirty(draft, options.baseline);
  const valid = validateSystemConfigDraft(current).length === 0;
  const update = useCallback(
    <K extends keyof SystemConfigDraft>(field: K, value: SystemConfigDraft[K]) => {
      if (!operation.isLocked()) setDraft(previous => ({ ...(previous ?? current), [field]: value }));
    },
    [current, operation]
  );
  const discard = useCallback(() => {
    if (!operation.isLocked()) setDraft(null);
  }, [operation]);
  const retry = useCallback(() => {
    if (!operation.isLocked()) void options.refetch();
  }, [operation, options]);
  const retryTimezones = useCallback(() => {
    if (!operation.isLocked()) void options.retryTimezones();
  }, [operation, options]);
  const save = useSystemConfigSave(current, dirty, valid, options.mutation, operation);
  return {
    discard,
    retry,
    retryTimezones,
    save,
    state: {
      current,
      dirty,
      saving: operation.pending || options.mutation.mutation.isPending,
      timezoneOptions: options.timezoneOptions,
      timezonesFailed: options.timezonesFailed,
      timezonesPending: options.timezonesPending,
      valid
    },
    update
  };
}

function useSystemConfigSave(
  current: SystemConfigDraft,
  dirty: boolean,
  valid: boolean,
  mutation: SystemConfigMutation,
  operation: ExclusiveOperation
) {
  return useCallback(() => {
    if (!dirty || !valid) return;
    const owner = operation.begin();
    if (!owner) return;
    mutation.mutate(
      {
        id: systemConfigResourceId,
        resource: 'system-config',
        dataProviderName: 'system-config',
        invalidates: ['detail'],
        mutationMode: 'pessimistic',
        values: current
      },
      {
        onSuccess: response => {
          if (!operation.isCurrent(owner)) return;
          try {
            persistSystemPreferences(response.data);
          } finally {
            operation.end(owner);
          }
          globalThis.location.reload();
        },
        onError: () => operation.end(owner)
      }
    );
  }, [current, dirty, mutation, operation, valid]);
}
