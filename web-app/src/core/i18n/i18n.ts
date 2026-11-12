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
type LocaleMessages = Record<string, unknown>;
const loadedCatalogs = new Map<
  SupportedLocale,
  { root: LocaleMessages; shell: LocaleMessages; explore: LocaleMessages }
>();
const hotRootCatalogs = new Map<SupportedLocale, LocaleMessages>();
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
    const root = hotRootCatalogs.get(locale) ?? messages;
    loadedCatalogs.set(locale, { root, shell: shellMessages, explore: exploreMessages });
    publishLocaleMessages(locale, root, shellMessages, exploreMessages);
  }
  return publishLatestLocale(locale, owner, options.signal);
}

function publishLocaleMessages(
  locale: SupportedLocale,
  messages: LocaleMessages,
  shellMessages: LocaleMessages,
  exploreMessages: LocaleMessages
) {
  i18n.removeResourceBundle(locale, 'translation');
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

/** Replace a Vite-updated root catalog without resetting user state or changing the selected locale. */
export function replaceLocaleRootMessages(locale: SupportedLocale, messages: LocaleMessages) {
  hotRootCatalogs.set(locale, messages);
  const current = loadedCatalogs.get(locale);
  if (!current) return;
  loadedCatalogs.set(locale, { ...current, root: messages });
  publishLocaleMessages(locale, messages, current.shell, current.explore);
  if (i18n.resolvedLanguage === locale) i18n.emit('languageChanged', i18n.language);
}

if (import.meta.hot) {
  import.meta.hot.accept(
    [
      '@/assets/i18n/en-us.json',
      '@/assets/i18n/zh-cn.json',
      '@/assets/i18n/zh-tw.json',
      '@/assets/i18n/ja-jp.json',
      '@/assets/i18n/pt-br.json'
    ],
    modules => {
      const locales: SupportedLocale[] = ['en-US', 'zh-CN', 'zh-TW', 'ja-JP', 'pt-BR'];
      modules.forEach((module, index) => {
        if (module) replaceLocaleRootMessages(locales[index]!, module.default as LocaleMessages);
      });
    }
  );
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
