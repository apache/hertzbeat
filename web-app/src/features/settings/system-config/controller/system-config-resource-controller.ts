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

import { useCustom, useOne, useUpdate, type HttpError, type OpenNotificationParams } from '@refinedev/core';
import { useTranslation } from 'react-i18next';

import { resolveLocale } from '@/core/i18n/i18n';
import { readRuntimeTheme } from '@/core/runtime-preferences';

import {
  createSystemConfigDraft,
  systemConfigResourceId,
  type SystemConfigDraft,
  type SystemConfigResourceRecord,
  type SystemTimezoneResourceRecord
} from '../model/system-config-model';
import { useSystemConfigFormController } from './system-config-form-controller';

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
  const defaults = runtimeDefaults(i18n.resolvedLanguage);
  const baseline = createSystemConfigDraft(
    config.result ? { ...config.result, theme: defaults.theme } : null,
    defaults
  );
  const form = useSystemConfigFormController({
    baseline,
    mutation,
    refetch: config.query.refetch,
    retryTimezones: timezones.query.refetch,
    timezoneOptions: buildTimezoneOptions(timezones.result.data?.items, baseline.timeZoneId),
    timezonesFailed: timezones.query.isError,
    timezonesPending: timezones.query.isPending
  });
  const kind = resolveKind(config.query.isPending, config.query.isError, config.query.error, config.result);

  return {
    discard: form.discard,
    retry: form.retry,
    retryTimezones: form.retryTimezones,
    save: form.save,
    state:
      kind === 'ready'
        ? ({
            kind,
            ...form.state
          } as const)
        : ({ kind } as const),
    update: form.update
  };
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
