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

describe('Public Status locale contract', () => {
  it('keeps every public status key aligned across runtime locales', () => {
    const expected = Object.keys(en.status).sort();

    for (const locale of [ja, pt, zhCn, zhTw]) {
      expect(Object.keys(locale.status).sort()).toEqual(expected);
    }
    expect(expected).toEqual(
      expect.arrayContaining(['feedback', 'historyUnavailable', 'incidentYear', 'invalid', 'permission'])
    );
  });
});
