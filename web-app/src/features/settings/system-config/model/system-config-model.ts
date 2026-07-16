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

import type { SupportedLocale } from '@/core/i18n/i18n';

import type { SystemConfigValue, TimezoneOption } from '../api/system-config-api';

export const systemLocales = ['en_US', 'zh_CN', 'zh_TW', 'ja_JP', 'pt_BR'] as const;
export const systemThemes = ['default', 'dark', 'compact'] as const;

export type SystemLocale = (typeof systemLocales)[number];
export type SystemTheme = (typeof systemThemes)[number];
export type SystemConfigDraft = { locale: SystemLocale | ''; timeZoneId: string; theme: SystemTheme | '' };

export const systemConfigResourceId = 'current' as const;
export const systemTimezonesResourceId = 'timezones' as const;

export type SystemConfigResourceRecord = {
  id: typeof systemConfigResourceId;
  locale: SystemLocale;
  timeZoneId: string;
  theme: SystemTheme;
};

export type SystemTimezoneResourceRecord = {
  id: typeof systemTimezonesResourceId;
  items: TimezoneOption[];
};

export class SystemConfigResourceContractError extends Error {
  constructor() {
    super('System Config resource response is invalid');
    this.name = 'SystemConfigResourceContractError';
  }
}

const runtimeToSystemLocale: Record<SupportedLocale, SystemLocale> = {
  'en-US': 'en_US',
  'zh-CN': 'zh_CN',
  'zh-TW': 'zh_TW',
  'ja-JP': 'ja_JP',
  'pt-BR': 'pt_BR'
};

export function localeToRuntime(locale?: string | null): SupportedLocale {
  const entry = Object.entries(runtimeToSystemLocale).find(([, value]) => value === locale);
  return (entry?.[0] as SupportedLocale | undefined) ?? 'en-US';
}

export function createSystemConfigDraft(
  config: { locale?: string; timeZoneId?: string; theme?: string } | null | undefined,
  defaults: { locale: SupportedLocale; timeZoneId: string; theme: SystemTheme }
): SystemConfigDraft {
  return {
    locale: systemLocales.includes(config?.locale as SystemLocale) ? config?.locale as SystemLocale : runtimeToSystemLocale[defaults.locale],
    timeZoneId: config?.timeZoneId?.trim() || defaults.timeZoneId,
    theme: systemThemes.includes(config?.theme as SystemTheme) ? config?.theme as SystemTheme : defaults.theme
  };
}

export function createSystemConfigResourceRecord(
  config: SystemConfigValue | null | undefined
): SystemConfigResourceRecord {
  if (!config || !systemLocales.includes(config.locale as SystemLocale)) {
    throw new SystemConfigResourceContractError();
  }
  if (!systemThemes.includes(config.theme as SystemTheme) || !config.timeZoneId?.trim()) {
    throw new SystemConfigResourceContractError();
  }
  return {
    id: systemConfigResourceId,
    locale: config.locale as SystemLocale,
    timeZoneId: config.timeZoneId.trim(),
    theme: config.theme as SystemTheme
  };
}

export function createSystemTimezoneResourceRecord(
  timezones: TimezoneOption[]
): SystemTimezoneResourceRecord {
  if (!Array.isArray(timezones) || !timezones.every(isTimezoneOption)) {
    throw new SystemConfigResourceContractError();
  }
  return {
    id: systemTimezonesResourceId,
    items: timezones.map(timezone => ({ ...timezone }))
  };
}

function isTimezoneOption(value: unknown): value is TimezoneOption {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Partial<TimezoneOption>;
  return typeof item.zoneId === 'string' && Boolean(item.zoneId.trim())
    && typeof item.offset === 'string' && Boolean(item.offset.trim())
    && typeof item.displayName === 'string' && Boolean(item.displayName.trim());
}

export function validateSystemConfigDraft(config: SystemConfigDraft) {
  return (['locale', 'timeZoneId', 'theme'] as const).filter(field => !config[field]);
}

export function isSystemConfigDirty(config: SystemConfigDraft, baseline: SystemConfigDraft) {
  return config.locale !== baseline.locale || config.timeZoneId !== baseline.timeZoneId || config.theme !== baseline.theme;
}
