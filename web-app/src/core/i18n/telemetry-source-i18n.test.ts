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

import { beforeAll, describe, expect, it } from 'vitest';
import en from '@/assets/i18n/explore/en-us.json';
import zhCn from '@/assets/i18n/explore/zh-cn.json';
import zhTw from '@/assets/i18n/explore/zh-tw.json';
import ja from '@/assets/i18n/explore/ja-jp.json';
import pt from '@/assets/i18n/explore/pt-br.json';
import { i18n, loadLocale } from './i18n';

beforeAll(async () => {
  await i18n.init({ fallbackLng: 'en-US', interpolation: { escapeValue: false }, resources: {} });
});
const cases = [
  ['en-US', en],
  ['zh-CN', zhCn],
  ['zh-TW', zhTw],
  ['ja-JP', ja],
  ['pt-BR', pt]
] as const;

describe('runtime telemetry source translations', () => {
  it.each(cases)('publishes the real lazy source bundle for %s', async (locale, catalog) => {
    i18n.removeResourceBundle(locale, 'translation');
    await expect(loadLocale(locale)).resolves.toBe(true);
    for (const [name, expected] of Object.entries(catalog.exploreSource)) {
      const key = `exploreSource.${name}`;
      expect(i18n.t(key)).toBe(expected);
      expect(i18n.t(key)).not.toBe(key);
    }
  });
});
