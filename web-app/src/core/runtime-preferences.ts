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

import { isSupportedLocale, type SupportedLocale } from './i18n/locale';

type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;
export type RuntimeTheme = 'default' | 'dark' | 'compact';

const localeKey = 'hertzbeat.locale';
const themeKey = 'hertzbeat.theme';
const themes = ['default', 'dark', 'compact'] as const;

function browserStorage(): PreferenceStorage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function readRuntimeLocale(
  storage: Pick<PreferenceStorage, 'getItem'> | undefined = browserStorage()
): SupportedLocale | null {
  const locale = readPreference(storage, localeKey);
  return isSupportedLocale(locale) ? locale : null;
}

export function readRuntimeTheme(
  storage: Pick<PreferenceStorage, 'getItem'> | undefined = browserStorage()
): RuntimeTheme {
  const value = readPreference(storage, themeKey);
  return isRuntimeTheme(value) ? value : 'dark';
}

export function persistSystemPreferences(
  config: { locale: string; theme: string },
  storage: PreferenceStorage | undefined = browserStorage()
) {
  if (!storage) return;
  const locale = config.locale.replace('_', '-');
  if (isSupportedLocale(locale)) writePreference(storage, localeKey, locale);
  if (isRuntimeTheme(config.theme)) writePreference(storage, themeKey, config.theme);
}

function isRuntimeTheme(value: unknown): value is RuntimeTheme {
  return themes.some(theme => theme === value);
}

function readPreference(storage: Pick<PreferenceStorage, 'getItem'> | undefined, key: string) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writePreference(storage: Pick<PreferenceStorage, 'setItem'>, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    // Browser preference storage is optional. A quota or security failure must
    // not turn an already successful server-side settings save into an error.
  }
}
