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

import { beforeAll, describe, expect, it, vi } from 'vitest';

const slowChineseBundle = vi.hoisted(() => {
  let resolve!: () => void;
  const promise = new Promise<void>(complete => {
    resolve = complete;
  });
  return { promise, resolve };
});

vi.mock('@/assets/i18n/zh-cn.json', async () => {
  await slowChineseBundle.promise;
  return { default: {} };
});
vi.mock('@/assets/i18n/shell/zh-cn.json', async () => {
  await slowChineseBundle.promise;
  return { default: {} };
});
vi.mock('@/assets/i18n/explore/zh-cn.json', async () => {
  await slowChineseBundle.promise;
  return { default: {} };
});

import { i18n, loadLocale, resolveLocale } from './i18n';

beforeAll(async () => {
  if (!i18n.isInitialized) {
    await i18n.init({ fallbackLng: 'en-US', interpolation: { escapeValue: false }, resources: {} });
  }
  i18n.addResourceBundle('en-US', 'translation', { test: 'English' }, true, true);
  i18n.removeResourceBundle('zh-CN', 'translation');
});

describe('locale resolution', () => {
  it('uses exact supported locales', () => {
    expect(resolveLocale('pt-BR')).toBe('pt-BR');
  });

  it('maps a language-only browser locale to a supported locale', () => {
    expect(resolveLocale('zh-SG')).toBe('zh-CN');
  });

  it('falls back to English', () => {
    expect(resolveLocale('fr-FR')).toBe('en-US');
  });

  it('does not publish an older slow locale after a newer locale has completed', async () => {
    const older = loadLocale('zh-CN');
    const newer = loadLocale('en-US');

    await expect(newer).resolves.toBe(true);
    expect(i18n.resolvedLanguage).toBe('en-US');

    slowChineseBundle.resolve();
    await expect(older).resolves.toBe(false);
    expect(i18n.resolvedLanguage).toBe('en-US');
  });

  it('serializes cached locale publication so an in-flight older change cannot win last', async () => {
    i18n.addResourceBundle('zh-CN', 'translation', { test: 'Chinese' }, true, true);
    const older = deferred<void>();
    const newer = deferred<void>();
    let publishedLocale = i18n.resolvedLanguage;
    const changeLanguage = vi.spyOn(i18n, 'changeLanguage').mockImplementation(async locale => {
      await (locale === 'zh-CN' ? older.promise : newer.promise);
      publishedLocale = locale;
      return i18n.t;
    });

    try {
      const first = loadLocale('zh-CN');
      await vi.waitFor(() => expect(changeLanguage).toHaveBeenCalledOnce());
      const second = loadLocale('en-US');
      newer.resolve();
      await Promise.resolve();
      older.resolve();

      await expect(first).resolves.toBe(false);
      await expect(second).resolves.toBe(true);
      expect(changeLanguage).toHaveBeenCalledTimes(2);
      expect(publishedLocale).toBe('en-US');
    } finally {
      changeLanguage.mockRestore();
    }
  });
});

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>(complete => {
    resolve = complete;
  });
  return { promise, resolve };
}
