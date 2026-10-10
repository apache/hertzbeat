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

import { resolveLocale, type SupportedLocale } from './locale';

export type { SupportedLocale } from './locale';
export { resolveLocale } from './locale';

const localeLoaders: Record<SupportedLocale, () => Promise<Record<string, unknown>>> = {
  'en-US': () => import('@/assets/i18n/en-us.json').then(module => module.default),
  'zh-CN': () => import('@/assets/i18n/zh-cn.json').then(module => module.default),
  'zh-TW': () => import('@/assets/i18n/zh-tw.json').then(module => module.default),
  'ja-JP': () => import('@/assets/i18n/ja-jp.json').then(module => module.default),
  'pt-BR': () => import('@/assets/i18n/pt-br.json').then(module => module.default)
};

const shellLocaleLoaders: Record<SupportedLocale, () => Promise<Record<string, unknown>>> = {
  'en-US': () => import('@/assets/i18n/shell/en-us.json').then(module => module.default),
  'zh-CN': () => import('@/assets/i18n/shell/zh-cn.json').then(module => module.default),
  'zh-TW': () => import('@/assets/i18n/shell/zh-tw.json').then(module => module.default),
  'ja-JP': () => import('@/assets/i18n/shell/ja-jp.json').then(module => module.default),
  'pt-BR': () => import('@/assets/i18n/shell/pt-br.json').then(module => module.default)
};

const exploreLocaleLoaders: Record<SupportedLocale, () => Promise<Record<string, unknown>>> = {
  'en-US': () => import('@/assets/i18n/explore/en-us.json').then(module => module.default),
  'zh-CN': () => import('@/assets/i18n/explore/zh-cn.json').then(module => module.default),
  'zh-TW': () => import('@/assets/i18n/explore/zh-tw.json').then(module => module.default),
  'ja-JP': () => import('@/assets/i18n/explore/ja-jp.json').then(module => module.default),
  'pt-BR': () => import('@/assets/i18n/explore/pt-br.json').then(module => module.default)
};

export const i18n = i18next.createInstance();
let latestLocaleLoad = 0;
let localePublication = Promise.resolve();

export async function loadLocale(locale: SupportedLocale, options: { signal?: AbortSignal } = {}) {
  const owner = ++latestLocaleLoad;
  if (!i18n.hasResourceBundle(locale, 'translation')) {
    const [messages, shellMessages, exploreMessages] = await Promise.all([
      localeLoaders[locale](),
      shellLocaleLoaders[locale](),
      exploreLocaleLoaders[locale]()
    ]);
    i18n.addResourceBundle(
      locale,
      'translation',
      {
        ...messages,
        ...shellMessages,
        exploreSource: {
          ...messageGroup(messages.exploreSource),
          ...messageGroup(exploreMessages.exploreSource)
        },
        exploreTrace: {
          ...messageGroup(messages.exploreTrace),
          ...messageGroup(exploreMessages.exploreTrace)
        },
        exploreInvestigation: {
          ...messageGroup(messages.exploreInvestigation),
          ...messageGroup(exploreMessages.exploreInvestigation)
        },
        explore: {
          ...messageGroup(messages.explore),
          ...messageGroup(exploreMessages.explore)
        }
      },
      true,
      true
    );
  }
  return publishLatestLocale(locale, owner, options.signal);
}

function publishLatestLocale(locale: SupportedLocale, owner: number, signal?: AbortSignal) {
  const ownsPublication = () => !signal?.aborted && owner === latestLocaleLoad;
  // i18next publication is not cancellable. Serialize it so an older
  // in-flight change always settles before the latest owner publishes.
  const publication = localePublication.then(async () => {
    if (!ownsPublication()) return false;
    await i18n.changeLanguage(locale);
    return ownsPublication();
  });
  localePublication = publication.then(
    () => undefined,
    () => undefined
  );
  return publication;
}

function messageGroup(value: unknown): object {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
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
