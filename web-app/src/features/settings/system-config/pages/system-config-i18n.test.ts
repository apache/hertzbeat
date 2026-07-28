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

import { describe, expect, it } from 'vitest';

import en from '@/assets/i18n/en-us.json';
import ja from '@/assets/i18n/ja-jp.json';
import pt from '@/assets/i18n/pt-br.json';
import zhCn from '@/assets/i18n/zh-cn.json';
import zhTw from '@/assets/i18n/zh-tw.json';

describe('system configuration locale contract', () => {
  it('keeps the System Configuration catalog aligned across runtime locales', () => {
    const expected = flatten(en.systemConfig);

    for (const locale of [ja, pt, zhCn, zhTw]) {
      expect(flatten(locale.systemConfig)).toEqual(expected);
      expect(locale.settingsNavigation.system).toBeTruthy();
    }
    expect(en.settingsNavigation.system).toBeTruthy();
    expect(expected).toContain('timezonesUnavailable');
    expect(expected).toEqual(expect.arrayContaining(['missing', 'permission', 'invalid']));
    expect(expected).toEqual(expect.arrayContaining(['theme.light-ops', 'theme.dark-ops', 'theme.compact']));
    expect(expected).not.toEqual(expect.arrayContaining(['theme.default', 'theme.dark']));
  });
});

function flatten(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value)
    .flatMap(([key, item]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return item && typeof item === 'object' && !Array.isArray(item)
        ? flatten(item as Record<string, unknown>, path)
        : [path];
    })
    .sort();
}
