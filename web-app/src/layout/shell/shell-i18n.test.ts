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

import en from '@/assets/i18n/shell/en-us.json';
import ja from '@/assets/i18n/shell/ja-jp.json';
import pt from '@/assets/i18n/shell/pt-br.json';
import zhCn from '@/assets/i18n/shell/zh-cn.json';
import zhTw from '@/assets/i18n/shell/zh-tw.json';

describe('shell locale contract', () => {
  it('keeps runtime status copy aligned across all five locales', () => {
    const expected = flatten(en.shell.status);
    for (const locale of [ja, pt, zhCn, zhTw]) {
      expect(flatten(locale.shell.status)).toEqual(expected);
    }
    expect(expected).toContain('reason.collector_status_unavailable');
    expect(expected).toContain('state.degraded');
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
