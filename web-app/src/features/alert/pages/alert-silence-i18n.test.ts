/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
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

import enUs from '@/assets/i18n/en-us.json';
import jaJp from '@/assets/i18n/ja-jp.json';
import ptBr from '@/assets/i18n/pt-br.json';
import zhCn from '@/assets/i18n/zh-cn.json';
import zhTw from '@/assets/i18n/zh-tw.json';

describe('Alert Silence locales', () => {
  it('keeps batch deletion copy complete in every locale', () => {
    for (const locale of [enUs, jaJp, ptBr, zhCn, zhTw]) {
      expect(locale.alertSilences.createTitle).toBeTruthy();
      expect(locale.alertSilences.deleteSelected).toBeTruthy();
      expect(locale.alertSilences.deleteSelectedConfirm).toContain('{{count}}');
      expect(locale.alertSilences.deleteSuccess).toBeTruthy();
    }
  });

  it('uses the source-length weekday labels and date prompt in both Chinese catalogs', () => {
    for (const locale of [zhCn, zhTw]) {
      expect(locale.alertSilences.days).toHaveLength(4);
      expect(locale.alertSilences.week['1']).toHaveLength(3);
      expect(locale.alertSilences.week['7']).toHaveLength(3);
    }
  });

  it('keeps schedule validation specific in every locale', () => {
    for (const locale of [enUs, jaJp, ptBr, zhCn, zhTw]) {
      expect(locale.alertSilences.periodInvalid).toBeTruthy();
      expect(locale.alertSilences.recurringPeriodInvalid).toBeTruthy();
      expect(locale.alertSilences.daysRequired).toBeTruthy();
    }
  });
});
