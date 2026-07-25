/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
    }
  });
});
