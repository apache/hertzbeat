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

import { useCustom, useNotification, useOne, useUpdate, type HttpError } from '@refinedev/core';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { resolveLocale } from '@/core/i18n/i18n';
import { readRuntimeTheme } from '@/core/runtime-preferences';

import { loadSystemConfig, systemConfigTimezonesEndpoint } from '../api/system-config-api';
import {
  createSystemConfigDraft,
  createSystemConfigResourceRecord,
  systemConfigResourceId,
  systemConfigResourceName,
  type SystemConfigDraft,
  type SystemConfigResourceRecord,
  type SystemTimezoneResourceRecord
} from '../model/system-config-model';
import { useSystemConfigFormController } from './system-config-form-controller';
import { useSystemConfigActionCapabilities } from './use-system-config-action-capabilities';

export function useSystemConfigResourceController() {
  const { t, i18n } = useTranslation();
  const notification = useNotification();
  const capabilities = useSystemConfigActionCapabilities();
  const { config, mutation, reread, timezones } = useSystemConfigResources();
  const defaults = runtimeDefaults(i18n.resolvedLanguage);
  const baseline = createSystemConfigDraft(config.result, defaults);
  const form = useSystemConfigFormController({
    baseline,
    canConfigure: capabilities.canConfigure,
    mutation,
    notifications: {
      notifyFailure: () => notification.open?.({ message: t('systemConfig.unavailable'), type: 'error' }),
      notifyRejected: () => notification.open?.({ message: t('systemConfig.saveFailed'), type: 'error' }),
      notifySuccess: () => notification.open?.({ message: t('systemConfig.saveSuccess'), type: 'success' })
    },
    reread,
    retryRead: config.query.refetch,
    retryTimezones: timezones.query.refetch,
    timezoneOptions: buildTimezoneOptions(timezones.result.data?.items, baseline.timeZoneId),
    timezonesFailed: timezones.query.isError,
    timezonesPending: timezones.query.isPending
  });
  const kind = resolveKind(config.query.isPending, config.query.isError, config.query.error, config.result);

  return {
    discard: form.discard,
    retryRead: form.retryRead,
    retrySave: form.retrySave,
    retryTimezones: form.retryTimezones,
    save: form.save,
    useCurrentServerSettings: form.useCurrentServerSettings,
    state:
      kind === 'ready' || form.state.locked
        ? ({
            kind: 'ready',
            ...form.state
          } as const)
        : ({ kind } as const),
    update: form.update
  };
}

function useSystemConfigResources() {
  const config = useOne<SystemConfigResourceRecord, HttpError>({
    resource: systemConfigResourceName,
    id: systemConfigResourceId,
    dataProviderName: systemConfigResourceName,
    errorNotification: false
  });
  const timezones = useCustom<SystemTimezoneResourceRecord, HttpError>({
    url: systemConfigTimezonesEndpoint,
    method: 'get',
    dataProviderName: systemConfigResourceName,
    errorNotification: false
  });
  const mutation = useUpdate<SystemConfigResourceRecord, HttpError, SystemConfigDraft>({
    resource: systemConfigResourceName,
    dataProviderName: systemConfigResourceName,
    invalidates: [],
    mutationMode: 'pessimistic',
    successNotification: false,
    errorNotification: false
  });
  const reread = useCallback(async () => {
    try {
      const value = await loadSystemConfig();
      return { data: value ? createSystemConfigResourceRecord(value) : undefined, error: null };
    } catch (error) {
      return { data: undefined, error };
    }
  }, []);
  return { config, mutation, reread, timezones };
}

function runtimeDefaults(language?: string) {
  return {
    locale: resolveLocale(language),
    timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    theme: readRuntimeTheme()
  };
}

function buildTimezoneOptions(timezones: SystemTimezoneResourceRecord['items'] | undefined, currentTimeZoneId: string) {
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
  if (failed) return classifyReadFailure(error);
  return record ? 'ready' : 'error';
}

function classifyReadFailure(error: HttpError | null) {
  if (readErrorCode(error) === 'SYSTEM_CONFIG_MISSING') return 'missing';
  if (error?.statusCode === 401 || error?.statusCode === 403) return 'permission';
  if (readErrorCode(error) === 'SYSTEM_CONFIG_RESPONSE_INVALID') return 'invalid';
  if (error?.statusCode === 0 || [502, 503, 504].includes(error?.statusCode ?? -1)) return 'unavailable';
  return 'error';
}

function readErrorCode(error: HttpError | null) {
  const code: unknown = error?.code;
  return typeof code === 'string' || typeof code === 'number' ? code : undefined;
}
