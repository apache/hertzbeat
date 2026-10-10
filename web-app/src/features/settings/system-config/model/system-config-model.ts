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
import type { RuntimeTheme } from '@/core/runtime-preferences';

import type { TimezoneOption } from './system-config-contract';

export const systemLocales = ['en_US', 'zh_CN', 'zh_TW', 'ja_JP', 'pt_BR'] as const;
export const systemThemes = ['light-ops', 'dark-ops', 'compact'] as const;

export type SystemLocale = (typeof systemLocales)[number];
export type SystemTheme = (typeof systemThemes)[number];
export type SystemConfigDraft = { locale: SystemLocale | ''; timeZoneId: string; theme: SystemTheme | '' };

export const systemConfigResourceName = 'system-config' as const;
export const systemConfigResourceId = 'current' as const;
export const systemTimezonesResourceId = 'timezones' as const;

export type SystemConfigResourceRecord = {
  id: typeof systemConfigResourceId;
  locale: SystemLocale;
  timeZoneId: string;
  theme: SystemTheme;
};
export type SystemConfigCanonicalProof = { record: SystemConfigResourceRecord };
export type SystemConfigSaveRecovery = { phase: 'proof'; canonicalProof: SystemConfigCanonicalProof | null };

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

const systemToRuntimeLocale: Record<SystemLocale, SupportedLocale> = {
  en_US: 'en-US',
  zh_CN: 'zh-CN',
  zh_TW: 'zh-TW',
  ja_JP: 'ja-JP',
  pt_BR: 'pt-BR'
};

const runtimeToSystemTheme: Record<RuntimeTheme, SystemTheme> = {
  default: 'light-ops',
  dark: 'dark-ops',
  compact: 'compact'
};

const systemToRuntimeTheme: Record<SystemTheme, RuntimeTheme> = {
  'light-ops': 'default',
  'dark-ops': 'dark',
  compact: 'compact'
};

export function localeToRuntime(locale?: string | null): SupportedLocale {
  return isSystemLocale(locale) ? systemToRuntimeLocale[locale] : 'en-US';
}

export function runtimeThemeToSystemTheme(theme: RuntimeTheme): SystemTheme {
  return runtimeToSystemTheme[theme];
}

export function systemThemeToRuntimeTheme(theme: SystemTheme): RuntimeTheme {
  return systemToRuntimeTheme[theme];
}

export function createSystemConfigDraft(
  config: { locale?: string; timeZoneId?: string; theme?: string } | null | undefined,
  defaults: { locale: SupportedLocale; timeZoneId: string; theme: RuntimeTheme }
): SystemConfigDraft {
  return {
    locale: isSystemLocale(config?.locale) ? config.locale : runtimeToSystemLocale[defaults.locale],
    timeZoneId: config?.timeZoneId?.trim() || defaults.timeZoneId,
    theme: isSystemTheme(config?.theme) ? config.theme : runtimeThemeToSystemTheme(defaults.theme)
  };
}

/**
 * Validates the untyped Refine mutation boundary and reconstructs the exact
 * writable System Config shape. Inherited or server-owned fields never cross
 * into the API client.
 */
export function createSystemConfigResourceRecord(config: unknown): SystemConfigResourceRecord {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new SystemConfigResourceContractError();
  }
  const locale = readOwnField(config, 'locale');
  const timeZoneId = readOwnField(config, 'timeZoneId');
  const theme = readOwnField(config, 'theme');
  if (!isSystemLocale(locale) || !isNonBlankString(timeZoneId) || !isSystemTheme(theme)) {
    throw new SystemConfigResourceContractError();
  }
  return {
    id: systemConfigResourceId,
    locale,
    timeZoneId: timeZoneId.trim(),
    theme
  };
}

export function createSystemTimezoneResourceRecord(timezones: unknown): SystemTimezoneResourceRecord {
  if (!Array.isArray(timezones)) {
    throw new SystemConfigResourceContractError();
  }
  return {
    id: systemTimezonesResourceId,
    items: timezones.map(readTimezoneOption)
  };
}

function isSystemLocale(value: unknown): value is SystemLocale {
  return systemLocales.some(locale => locale === value);
}

function isSystemTheme(value: unknown): value is SystemTheme {
  return systemThemes.some(theme => theme === value);
}

function readTimezoneOption(value: unknown): TimezoneOption {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SystemConfigResourceContractError();
  }

  const zoneId = readOwnField(value, 'zoneId');
  const offset = readOwnField(value, 'offset');
  const displayName = readOwnField(value, 'displayName');
  if (!isNonBlankString(zoneId) || !isNonBlankString(offset) || !isNonBlankString(displayName)) {
    throw new SystemConfigResourceContractError();
  }
  return { zoneId, offset, displayName };
}

function readOwnField(value: object, field: string): unknown {
  return Object.hasOwn(value, field) ? Reflect.get(value, field) : undefined;
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim());
}

export function validateSystemConfigDraft(config: SystemConfigDraft) {
  return (['locale', 'timeZoneId', 'theme'] as const).filter(field => !config[field]);
}

export function isSystemConfigDirty(config: SystemConfigDraft, baseline: SystemConfigDraft) {
  return (
    config.locale !== baseline.locale || config.timeZoneId !== baseline.timeZoneId || config.theme !== baseline.theme
  );
}

/** All System Config fields are readable, so exact canonical equality proves an ambiguous save. */
export function systemConfigSaveConverged(draft: SystemConfigDraft, record: SystemConfigResourceRecord) {
  return draft.locale === record.locale && draft.timeZoneId === record.timeZoneId && draft.theme === record.theme;
}
