/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import en from '@/assets/i18n/en-us.json';
import ja from '@/assets/i18n/ja-jp.json';
import pt from '@/assets/i18n/pt-br.json';
import zhCn from '@/assets/i18n/zh-cn.json';
import zhTw from '@/assets/i18n/zh-tw.json';

describe('Alert Rule locale coverage', () => {
  it('provides batch-delete copy in every runtime locale', () => {
    for (const locale of [en, ja, pt, zhCn, zhTw]) {
      expect(locale.alertRules.deleteSelected).toBeTruthy();
      expect(locale.alertRules.deleteSelectedConfirm).toContain('{{count}}');
      expect(locale.alertRules.export.selected).toBeTruthy();
      expect(locale.alertRules.export.format.json).toBeTruthy();
      expect(locale.alertRules.export.format.excel).toBeTruthy();
      expect(locale.alertRules.export.failure.unavailable).toBeTruthy();
      expect(locale.alertRules.import.open).toBeTruthy();
      expect(locale.alertRules.import.validation.unsupported).toBeTruthy();
      expect(locale.alertRules.import.failure.uncertain).toBeTruthy();
      expect(locale.alertRules.import.inspect).toBeTruthy();
      expect(locale.alertRules.datasource.checking).toBeTruthy();
      expect(locale.alertRules.datasource.none).toBeTruthy();
      expect(locale.alertRules.datasource.promqlOnly).toBeTruthy();
      expect(locale.alertRules.datasource.sqlOnly).toBeTruthy();
    }
  });
});
