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

import {
  useCustom,
  useOne,
  useUpdate,
  type HttpError,
  type OpenNotificationParams
} from '@refinedev/core';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { resolveLocale } from '@/core/i18n/i18n';
import { persistSystemPreferences, readRuntimeTheme } from '@/core/runtime-preferences';

import {
  createSystemConfigDraft,
  isSystemConfigDirty,
  systemConfigResourceId,
  validateSystemConfigDraft,
  type SystemConfigDraft,
  type SystemConfigResourceRecord,
  type SystemTimezoneResourceRecord
} from '../model/system-config-model';

const resourceName = 'system-config';
const providerName = 'system-config';
const timezonesUrl = '/api/config/timezones';

export function useSystemConfigResourceController() {
  const { t, i18n } = useTranslation();
  const config = useOne<SystemConfigResourceRecord, HttpError>({
    resource: resourceName,
    id: systemConfigResourceId,
    dataProviderName: providerName,
    errorNotification: false
  });
  const timezones = useCustom<SystemTimezoneResourceRecord, HttpError>({
    url: timezonesUrl,
    method: 'get',
    dataProviderName: providerName,
    errorNotification: false
  });
  const mutation = useUpdate<SystemConfigResourceRecord, HttpError, SystemConfigDraft>({
    resource: resourceName,
    dataProviderName: providerName,
    invalidates: ['detail'],
    mutationMode: 'pessimistic',
    successNotification: () => notice(t('systemConfig.saveSuccess'), 'success'),
    errorNotification: () => notice(t('systemConfig.saveFailed'), 'error')
  });
  const [draft, setDraft] = useState<SystemConfigDraft | null>(null);
  const defaults = runtimeDefaults(i18n.resolvedLanguage);
  const baseline = createSystemConfigDraft(
    config.result ? { ...config.result, theme: defaults.theme } : null,
    defaults
  );
  const current = draft ?? baseline;
  const dirty = draft !== null && isSystemConfigDirty(draft, baseline);
  const valid = validateSystemConfigDraft(current).length === 0;
  const timezoneOptions = buildTimezoneOptions(timezones.result.data?.items, current.timeZoneId);

  const update = useCallback(<K extends keyof SystemConfigDraft>(field: K, value: SystemConfigDraft[K]) => {
    setDraft(previous => ({ ...(previous ?? current), [field]: value }));
  }, [current]);
  const discard = useCallback(() => setDraft(null), []);
  const retry = useCallback(() => { void config.query.refetch(); }, [config.query]);
  const retryTimezones = useCallback(() => { void timezones.query.refetch(); }, [timezones.query]);
  const save = useCallback(() => {
    if (!dirty || !valid) return;
    mutation.mutate({
      id: systemConfigResourceId,
      resource: resourceName,
      dataProviderName: providerName,
      invalidates: ['detail'],
      mutationMode: 'pessimistic',
      values: current
    }, {
      onSuccess: response => {
        persistSystemPreferences(response.data);
        globalThis.location.reload();
      }
    });
  }, [current, dirty, mutation, valid]);
  const kind = resolveKind(config.query.isPending, config.query.isError, config.query.error, config.result);

  return {
    discard,
    retry,
    retryTimezones,
    save,
    state: kind === 'ready'
      ? {
          kind,
          current,
          dirty,
          saving: mutation.mutation.isPending,
          timezoneOptions,
          timezonesFailed: timezones.query.isError,
          timezonesPending: timezones.query.isPending,
          valid
        } as const
      : { kind } as const,
    update
  };
}

function runtimeDefaults(language?: string) {
  return {
    locale: resolveLocale(language),
    timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    theme: readRuntimeTheme()
  };
}

function buildTimezoneOptions(
  timezones: SystemTimezoneResourceRecord['items'] | undefined,
  currentTimeZoneId: string
) {
  const options = (timezones ?? []).map(timezone => ({
    value: timezone.zoneId,
    label: `${timezone.zoneId} (${timezone.offset}) ${timezone.displayName}`
  }));
  if (currentTimeZoneId && !options.some(option => option.value === currentTimeZoneId)) {
    options.unshift({ value: currentTimeZoneId, label: currentTimeZoneId });
  }
  return options;
}

function resolveKind(
  pending: boolean,
  failed: boolean,
  error: HttpError | null,
  record: SystemConfigResourceRecord | undefined
) {
  if (pending) return 'loading';
  if (failed) return isUnavailable(error) ? 'unavailable' : 'error';
  return record ? 'ready' : 'error';
}

function isUnavailable(error: HttpError | null) {
  if (readErrorCode(error) === 'SYSTEM_CONFIG_RESPONSE_INVALID') return false;
  return error?.statusCode === 0 || [502, 503, 504].includes(error?.statusCode ?? -1);
}

function readErrorCode(error: HttpError | null) {
  const code: unknown = error?.code;
  return typeof code === 'string' || typeof code === 'number' ? code : undefined;
}

function notice(message: string, type: OpenNotificationParams['type']): OpenNotificationParams {
  return { message, type };
}
