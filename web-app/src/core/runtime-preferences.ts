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

import type { SupportedLocale } from './i18n/i18n';

type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;
export type RuntimeTheme = 'default' | 'dark' | 'compact';

const localeKey = 'hertzbeat.locale';
const themeKey = 'hertzbeat.theme';
const locales = ['en-US', 'zh-CN', 'zh-TW', 'ja-JP', 'pt-BR'] as const;
const themes = ['default', 'dark', 'compact'] as const;

function browserStorage(): PreferenceStorage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function readRuntimeLocale(storage: Pick<PreferenceStorage, 'getItem'> | undefined = browserStorage()): SupportedLocale | null {
  const locale = storage?.getItem(localeKey);
  return locales.includes(locale as SupportedLocale) ? locale as SupportedLocale : null;
}

export function readRuntimeTheme(storage: Pick<PreferenceStorage, 'getItem'> | undefined = browserStorage()): RuntimeTheme {
  const value = storage?.getItem(themeKey);
  return themes.includes(value as RuntimeTheme) ? value as RuntimeTheme : 'dark';
}

export function persistSystemPreferences(config: { locale: string; theme: string }, storage: PreferenceStorage | undefined = browserStorage()) {
  if (!storage) return;
  const locale = config.locale.replace('_', '-');
  if (locales.includes(locale as SupportedLocale)) storage.setItem(localeKey, locale);
  if (themes.includes(config.theme as RuntimeTheme)) storage.setItem(themeKey, config.theme);
}
