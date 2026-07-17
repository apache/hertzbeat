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

import i18next from 'i18next';

import { readRuntimeLocale } from '@/core/runtime-preferences';

import { supportedLocales, type SupportedLocale } from './locale';

export type { SupportedLocale } from './locale';

const localeLoaders: Record<SupportedLocale, () => Promise<{ default: Record<string, unknown> }>> = {
  'en-US': () => import('@/assets/i18n/en-us.json'),
  'zh-CN': () => import('@/assets/i18n/zh-cn.json'),
  'zh-TW': () => import('@/assets/i18n/zh-tw.json'),
  'ja-JP': () => import('@/assets/i18n/ja-jp.json'),
  'pt-BR': () => import('@/assets/i18n/pt-br.json')
};

const shellLocaleLoaders: Record<SupportedLocale, () => Promise<{ default: Record<string, unknown> }>> = {
  'en-US': () => import('@/assets/i18n/shell/en-us.json'),
  'zh-CN': () => import('@/assets/i18n/shell/zh-cn.json'),
  'zh-TW': () => import('@/assets/i18n/shell/zh-tw.json'),
  'ja-JP': () => import('@/assets/i18n/shell/ja-jp.json'),
  'pt-BR': () => import('@/assets/i18n/shell/pt-br.json')
};

const exploreLocaleLoaders: Record<SupportedLocale, () => Promise<{ default: Record<string, unknown> }>> = {
  'en-US': () => import('@/assets/i18n/explore/en-us.json'),
  'zh-CN': () => import('@/assets/i18n/explore/zh-cn.json'),
  'zh-TW': () => import('@/assets/i18n/explore/zh-tw.json'),
  'ja-JP': () => import('@/assets/i18n/explore/ja-jp.json'),
  'pt-BR': () => import('@/assets/i18n/explore/pt-br.json')
};

export const i18n = i18next.createInstance();

export function resolveLocale(value?: string | null): SupportedLocale {
  if (value && supportedLocales.includes(value as SupportedLocale)) return value as SupportedLocale;
  const language = value?.split('-')[0];
  return supportedLocales.find(locale => locale.startsWith(`${language}-`)) ?? 'en-US';
}

export async function loadLocale(locale: SupportedLocale) {
  if (!i18n.hasResourceBundle(locale, 'translation')) {
    const [messages, shellMessages, exploreMessages] = await Promise.all([
      localeLoaders[locale](),
      shellLocaleLoaders[locale](),
      exploreLocaleLoaders[locale]()
    ]);
    i18n.addResourceBundle(locale, 'translation', {
      ...messages.default,
      ...shellMessages.default,
      exploreTrace: {
        ...messageGroup(messages.default.exploreTrace),
        ...messageGroup(exploreMessages.default.exploreTrace)
      },
      explore: {
        ...messageGroup(messages.default.explore),
        ...messageGroup(exploreMessages.default.explore)
      }
    }, true, true);
  }
  await i18n.changeLanguage(locale);
}

function messageGroup(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export async function initializeI18n() {
  if (!i18n.isInitialized) {
    await i18n.init({
      fallbackLng: 'en-US',
      interpolation: { escapeValue: false },
      resources: {}
    });
  }
  await loadLocale(readRuntimeLocale() ?? resolveLocale(globalThis.navigator?.language));
  return i18n;
}
