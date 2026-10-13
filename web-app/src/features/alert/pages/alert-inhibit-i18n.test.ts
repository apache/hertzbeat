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

describe('Alert Inhibit locales', () => {
  it('keeps batch deletion copy complete in every locale', () => {
    for (const locale of [enUs, jaJp, ptBr, zhCn, zhTw]) {
      expect(locale.alertInhibits.deleteSelected).toBeTruthy();
      expect(locale.alertInhibits.deleteSelectedConfirm).toContain('{{count}}');
      expect(locale.alertInhibits.equalPlaceholder).toBeTruthy();
      expect(locale.alertInhibits.matcherKey).toBeTruthy();
      expect(locale.alertInhibits.matcherValue).toBeTruthy();
      expect(locale.alertInhibits.addMatcher).toBeTruthy();
      expect(locale.alertInhibits.removeMatcher).toBeTruthy();
      expect(locale.alertInhibits.required).toBeTruthy();
      expect(locale.alertInhibits.logicPreview.title).toBeTruthy();
      expect(locale.alertInhibits.logicPreview.trigger).toBeTruthy();
      expect(locale.alertInhibits.logicPreview.triggerDetail).toContain('{{source}}');
      expect(locale.alertInhibits.logicPreview.effect).toBeTruthy();
      expect(locale.alertInhibits.logicPreview.effectDetail).toContain('{{target}}');
      expect(locale.alertInhibits.logicPreview.condition).toBeTruthy();
      expect(locale.alertInhibits.logicPreview.conditionDetail).toContain('{{equal}}');
      expect(locale.alertInhibits.logicPreview.sourceEmpty).toBeTruthy();
      expect(locale.alertInhibits.logicPreview.targetEmpty).toBeTruthy();
      expect(locale.alertInhibits.logicPreview.equalEmpty).toBeTruthy();
      expect(locale.alertInhibits.management.title).toBeTruthy();
      expect(locale.alertInhibits.management.entityFallback).toContain('{{id}}');
      expect(locale.alertInhibits.management.empty).toBeTruthy();
      expect(locale.alertInhibits.management.missing).toContain('{{count}}');
      expect(locale.alertInhibits.management.viewAll).toBeTruthy();
      expect(locale.alertInhibits.management.viewMatched).toBeTruthy();
      expect(locale.alertInhibits.management.return).toBeTruthy();
      expect(locale.alertInhibits.entityPrefill.name).toContain('{{entity}}');
      expect(locale.alertInhibits.entityPrefill.received).toBeTruthy();
      expect(locale.alertInhibits.entityPrefill.manual).toBeTruthy();
      expect(locale.alertInhibits.entityPrefill.unavailable).toBeTruthy();
      expect(locale.alertInhibits.entityPrefill.error).toBeTruthy();
      expect(locale.alertSilences.management.title).toBeTruthy();
      expect(locale.alertSilences.management.entityFallback).toContain('{{id}}');
      expect(locale.alertSilences.management.empty).toBeTruthy();
      expect(locale.alertSilences.management.missing).toContain('{{count}}');
      expect(locale.alertSilences.management.viewAll).toBeTruthy();
      expect(locale.alertSilences.management.viewMatched).toBeTruthy();
      expect(locale.alertSilences.management.return).toBeTruthy();
    }

    expect(enUs.alertInhibits.new).toBe('New Inhibit Rule');
    expect(enUs.alertInhibits.name).toBe('Inhibit Rule Name');
    expect(enUs.alertInhibits.sourceLabels).toBe('Source Labels');
    expect(enUs.alertInhibits.targetLabels).toBe('Target Labels');
    expect(enUs.alertInhibits.enabled).toBe('Enable');
  });
});
